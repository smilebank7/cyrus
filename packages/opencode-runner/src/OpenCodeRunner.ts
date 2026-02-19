/**
 * OpenCode Runner
 *
 * Implements IAgentRunner for the OpenCode CLI agent.
 * Spawns `opencode run --format json` as a child process,
 * parses newline-delimited JSON events from stdout,
 * and converts them to SDKMessages via the adapters module.
 *
 * @packageDocumentation
 */

import { type ChildProcess, spawn } from "node:child_process";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { AssistantMessage, Event } from "@opencode-ai/sdk";
import type {
	IAgentRunner,
	IMessageFormatter,
	SDKAssistantMessage,
	SDKMessage,
	SDKResultMessage,
} from "cyrus-core";
import {
	extractSessionId,
	openCodeEventToSDKMessage,
	synthesizeResultMessage,
} from "./adapters.js";
import { OpenCodeMessageFormatter } from "./formatter.js";
import type {
	OpenCodeRunnerConfig,
	OpenCodeRunnerEvents,
	OpenCodeSessionInfo,
} from "./types.js";

export declare interface OpenCodeRunner {
	on<K extends keyof OpenCodeRunnerEvents>(
		event: K,
		listener: OpenCodeRunnerEvents[K],
	): this;
	emit<K extends keyof OpenCodeRunnerEvents>(
		event: K,
		...args: Parameters<OpenCodeRunnerEvents[K]>
	): boolean;
}

/**
 * OpenCodeRunner manages OpenCode CLI sessions.
 *
 * It spawns `opencode run --format json` which outputs newline-delimited
 * JSON events on stdout. These events are converted to SDKMessages using
 * the adapters from adapters.ts.
 *
 * @example
 * ```typescript
 * const runner = new OpenCodeRunner({
 *   cyrusHome: '/home/user/.cyrus',
 *   workingDirectory: '/path/to/repo',
 *   autoApprove: true,
 * });
 *
 * await runner.start("Fix the bug in auth.ts");
 * ```
 */
export class OpenCodeRunner extends EventEmitter implements IAgentRunner {
	readonly supportsStreamingInput = false;

	private config: OpenCodeRunnerConfig;
	private childProcess: ChildProcess | null = null;
	private sessionInfo: OpenCodeSessionInfo | null = null;
	private logStream: WriteStream | null = null;
	private readableLogStream: WriteStream | null = null;
	private messages: SDKMessage[] = [];
	private cyrusHome: string;
	private lastAssistantMessage: SDKAssistantMessage | null = null;
	private lastAssistantInfo: AssistantMessage | null = null;
	private formatter: IMessageFormatter;
	private readlineInterface: ReturnType<typeof createInterface> | null = null;
	private pendingResultMessage: SDKMessage | null = null;

	constructor(config: OpenCodeRunnerConfig) {
		super();
		this.config = config;
		this.cyrusHome = config.cyrusHome;
		this.formatter = new OpenCodeMessageFormatter();

		if (config.onMessage)
			this.on("message", config.onMessage as (...args: any[]) => void);
		if (config.onError) this.on("error", config.onError);
		if (config.onComplete)
			this.on("complete", config.onComplete as (...args: any[]) => void);
	}

	/**
	 * Start a new OpenCode session with a string prompt.
	 */
	async start(prompt: string): Promise<OpenCodeSessionInfo> {
		if (this.isRunning()) {
			throw new Error("OpenCode session already running");
		}

		this.sessionInfo = {
			sessionId: null,
			startedAt: new Date(),
			isRunning: true,
			openCodeSessionId: null,
			serverPort: null,
		};

		console.log("[OpenCodeRunner] Starting new session");
		console.log(
			"[OpenCodeRunner] Working directory:",
			this.config.workingDirectory,
		);

		if (this.config.workingDirectory) {
			try {
				mkdirSync(this.config.workingDirectory, { recursive: true });
			} catch (err) {
				console.error(
					"[OpenCodeRunner] Failed to create working directory:",
					err,
				);
			}
		}

		this.setupLogging();
		this.messages = [];

		try {
			const opencodePath = this.config.serverConfig?.baseURL
				? this.config.serverConfig.baseURL
				: "opencode";
			const args: string[] = ["run", "--format", "json"];

			// Add model if specified (opencode CLI uses "provider/model" format)
			if (this.config.model) {
				// If providerId is set, combine as "provider/model"
				if (this.config.providerId && !this.config.model.includes("/")) {
					args.push("--model", `${this.config.providerId}/${this.config.model}`);
				} else {
					args.push("--model", this.config.model);
				}
			} else if (this.config.providerId) {
				// Default to anthropic/claude-sonnet-4-20250514 if only provider is set
				args.push("--model", `${this.config.providerId}/claude-sonnet-4-20250514`);
			}

			// Note: opencode CLI 1.x does not support --auto-approve, --system-prompt, --max-turns
			// These are handled via opencode config or ignored

			// Add the prompt as positional argument (opencode CLI uses positional args, not --prompt)
			args.push(prompt);

			// Prepare environment
			const env = { ...process.env };

			// Set working directory for opencode
			if (this.config.workingDirectory) {
				env.OPENCODE_CWD = this.config.workingDirectory;
			}

			console.log(
				`[OpenCodeRunner] Spawning: ${opencodePath} ${args.join(" ")}`,
			);
			this.childProcess = spawn(opencodePath, args, {
				cwd: this.config.workingDirectory,
				stdio: ["ignore", "pipe", "pipe"],
				env,
			});

			// Set up stdout line reader for JSON events
			this.readlineInterface = createInterface({
				input: this.childProcess.stdout!,
				crlfDelay: Number.POSITIVE_INFINITY,
			});

			this.readlineInterface.on("line", (line: string) => {
				const trimmed = line.trim();
				if (!trimmed) return;

				try {
					const event = JSON.parse(trimmed) as Event;
					this.processEvent(event);
				} catch {
					console.error(
						"[OpenCodeRunner] Failed to parse JSON event:",
						trimmed.substring(0, 200),
					);
				}
			});

			// Handle stderr
			this.childProcess.stderr?.on("data", (data: Buffer) => {
				console.error("[OpenCodeRunner] stderr:", data.toString());
			});

			// Wait for process to complete
			await new Promise<void>((resolve, reject) => {
				if (!this.childProcess) {
					reject(new Error("Process not started"));
					return;
				}

				this.childProcess.on("close", (code: number | null) => {
					console.log(`[OpenCodeRunner] Process exited with code ${code}`);
					if (code === 0 || code === null) {
						resolve();
					} else {
						reject(new Error(`OpenCode CLI exited with code ${code}`));
					}
				});

				this.childProcess.on("error", (err: Error) => {
					console.error("[OpenCodeRunner] Process error:", err);
					reject(err);
				});
			});

			// Session completed
			console.log(
				`[OpenCodeRunner] Session completed with ${this.messages.length} messages`,
			);
			this.sessionInfo.isRunning = false;

			// If no result message was emitted, synthesize one
			if (this.pendingResultMessage) {
				this.emitMessage(this.pendingResultMessage);
				this.pendingResultMessage = null;
			} else if (!this.messages.some((m) => m.type === "result")) {
				const resultMsg = synthesizeResultMessage(
					this.sessionInfo.sessionId,
					this.lastAssistantMessage,
					this.lastAssistantInfo,
				);
				this.emitMessage(resultMsg);
			}

			this.emit("complete", this.messages as any);
		} catch (error) {
			console.error("[OpenCodeRunner] Session error:", error);

			if (this.sessionInfo) {
				this.sessionInfo.isRunning = false;
			}

			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorResult: SDKResultMessage = {
				type: "result",
				subtype: "error_during_execution",
				duration_ms: Date.now() - this.sessionInfo!.startedAt.getTime(),
				duration_api_ms: 0,
				is_error: true,
				num_turns: 0,
				errors: [errorMessage],
				stop_reason: null,
				total_cost_usd: 0,
				usage: {
					input_tokens: 0,
					output_tokens: 0,
					cache_creation_input_tokens: 0,
					cache_read_input_tokens: 0,
					cache_creation: {
						ephemeral_1h_input_tokens: 0,
						ephemeral_5m_input_tokens: 0,
					},
					server_tool_use: {
						web_fetch_requests: 0,
						web_search_requests: 0,
					},
					service_tier: "standard",
					inference_geo: "",
					iterations: [],
				},
				modelUsage: {},
				permission_denials: [],
				uuid: crypto.randomUUID(),
				session_id: this.sessionInfo?.sessionId || "pending",
			};

			this.emitMessage(errorResult);
			this.emit(
				"error",
				error instanceof Error ? error : new Error(String(error)),
			);
		} finally {
			this.childProcess = null;
			this.pendingResultMessage = null;

			if (this.logStream) {
				this.logStream.end();
				this.logStream = null;
			}
			if (this.readableLogStream) {
				this.readableLogStream.end();
				this.readableLogStream = null;
			}
		}

		return this.sessionInfo;
	}

	/**
	 * Process an OpenCode event from the JSON stream.
	 */
	private processEvent(event: Event): void {
		console.log(
			`[OpenCodeRunner] Event: ${event.type}`,
			JSON.stringify(event).substring(0, 200),
		);

		const sessionId = extractSessionId(event);
		if (sessionId && this.sessionInfo && !this.sessionInfo.sessionId) {
			this.sessionInfo.sessionId = sessionId;
			this.sessionInfo.openCodeSessionId = sessionId;
			console.log(`[OpenCodeRunner] Session ID assigned: ${sessionId}`);
			this.setupLogging();

			const systemInitMessage: SDKMessage = {
				type: "system",
				subtype: "init",
				agents: undefined,
				apiKeySource: "user",
				claude_code_version: "opencode-adapter",
				cwd: this.config.workingDirectory || process.cwd(),
				tools: [],
				mcp_servers: [],
				model: this.config.model || "anthropic/claude-sonnet-4-20250514",
				permissionMode: "default",
				slash_commands: [],
				output_style: "default",
				skills: [],
				plugins: [],
				uuid: crypto.randomUUID(),
				session_id: sessionId,
			};
			this.emitMessage(systemInitMessage);
		}

		// Track assistant message info for result synthesis
		if (event.type === "message.updated") {
			const msg = (event as any).properties?.info;
			if (msg?.role === "assistant") {
				this.lastAssistantInfo = msg as AssistantMessage;
			}
		}

		// Convert to SDK message
		const message = openCodeEventToSDKMessage(
			event,
			this.sessionInfo?.sessionId || null,
			this.lastAssistantMessage,
			this.lastAssistantInfo,
		);

		if (message) {
			if (message.type === "assistant") {
				this.lastAssistantMessage = message;
			}
			// Defer result message to after process exit
			if (message.type === "result") {
				this.pendingResultMessage = message;
			} else {
				this.emitMessage(message);
			}
		}
	}

	/**
	 * Emit a message.
	 */
	private emitMessage(message: SDKMessage): void {
		this.messages.push(message);

		if (this.logStream) {
			const logEntry = {
				type: "sdk-message",
				message,
				timestamp: new Date().toISOString(),
			};
			this.logStream.write(`${JSON.stringify(logEntry)}\n`);
		}

		if (this.readableLogStream) {
			this.writeReadableLogEntry(message);
		}

		this.emit("message", message as any);
	}

	/**
	 * Stop the current session.
	 */
	stop(): void {
		if (this.readlineInterface) {
			if (typeof this.readlineInterface.close === "function") {
				this.readlineInterface.close();
			}
			this.readlineInterface.removeAllListeners();
			this.readlineInterface = null;
		}

		if (this.childProcess) {
			console.log("[OpenCodeRunner] Stopping OpenCode process");
			this.childProcess.kill("SIGTERM");
			this.childProcess = null;
		}

		if (this.sessionInfo) {
			this.sessionInfo.isRunning = false;
		}
	}

	/**
	 * Check if the session is currently running.
	 */
	isRunning(): boolean {
		return this.sessionInfo?.isRunning ?? false;
	}

	/**
	 * Get all messages from the current session.
	 */
	getMessages(): SDKMessage[] {
		return [...this.messages];
	}

	/**
	 * Get the message formatter.
	 */
	getFormatter(): IMessageFormatter {
		return this.formatter;
	}

	/**
	 * Set up logging streams.
	 */
	private setupLogging(): void {
		const logsDir = join(this.cyrusHome, "logs");
		const workspaceName =
			this.config.workspaceName ||
			(this.config.workingDirectory
				? this.config.workingDirectory.split("/").pop()
				: "default") ||
			"default";
		const workspaceLogsDir = join(logsDir, workspaceName);
		const sessionId = this.sessionInfo?.sessionId || "pending";

		if (this.logStream) this.logStream.end();
		if (this.readableLogStream) this.readableLogStream.end();

		mkdirSync(workspaceLogsDir, { recursive: true });

		const logPath = join(workspaceLogsDir, `${sessionId}.ndjson`);
		const readableLogPath = join(workspaceLogsDir, `${sessionId}.log`);

		console.log(`[OpenCodeRunner] Logging to: ${logPath}`);

		this.logStream = createWriteStream(logPath, { flags: "a" });
		this.readableLogStream = createWriteStream(readableLogPath, { flags: "a" });

		const startEntry = {
			type: "session-start",
			sessionId,
			timestamp: new Date().toISOString(),
			config: {
				model: this.config.model,
				workingDirectory: this.config.workingDirectory,
			},
		};
		this.logStream.write(`${JSON.stringify(startEntry)}\n`);
		this.readableLogStream.write(
			`=== Session ${sessionId} started at ${new Date().toISOString()} ===\n\n`,
		);
	}

	/**
	 * Write a human-readable log entry.
	 */
	private writeReadableLogEntry(message: SDKMessage): void {
		if (!this.readableLogStream) return;

		const timestamp = new Date().toISOString();
		this.readableLogStream.write(`[${timestamp}] ${message.type}\n`);

		if (message.type === "user" || message.type === "assistant") {
			const content =
				typeof message.message.content === "string"
					? message.message.content
					: JSON.stringify(message.message.content, null, 2);
			this.readableLogStream.write(`${content}\n\n`);
		} else {
			this.readableLogStream.write(`${JSON.stringify(message, null, 2)}\n\n`);
		}
	}
}
