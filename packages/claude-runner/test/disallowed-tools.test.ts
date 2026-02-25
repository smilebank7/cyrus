import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import * as claudeCode from "@anthropic-ai/claude-agent-sdk";
import { createLogger, LogLevel } from "sylas-core";
import { ClaudeRunner } from "../src/ClaudeRunner";
import type { ClaudeRunnerConfig } from "../src/types";

// Mock the query function from @anthropic-ai/claude-agent-sdk
mock.module("@anthropic-ai/claude-agent-sdk", () => ({
	query: mock(),
}));

// Mock file system with all required methods
mock.module("fs", () => ({
	readFileSync: mock(),
	existsSync: mock(() => true),
	mkdirSync: mock(),
	createWriteStream: mock(() => ({
		write: mock(),
		end: mock(),
		on: mock(),
	})),
	statSync: mock(() => ({
		isDirectory: mock(() => true),
	})),
}));

describe("ClaudeRunner - disallowedTools", () => {
	const queryMock = claudeCode.query as any;

	beforeEach(() => {
		mock.restore();
		queryMock.mockClear?.();
		// Mock the query to return an async generator
		queryMock.mockImplementation(async function* () {
			// Empty generator for testing
		});
	});

	afterEach(() => {
		mock.restore();
	});

	it("should pass disallowedTools to Claude Code when configured", async () => {
		const config: ClaudeRunnerConfig = {
			workingDirectory: "/test",
			allowedTools: ["Read(**)", "Edit(**)"],
			disallowedTools: ["Bash", "WebFetch"],
			sylasHome: "/test/sylas",
		};

		// Mock the query to capture arguments and return a session ID message
		queryMock.mockImplementation(async function* (_args: any) {
			// Yield a session ID message
			yield {
				type: "system",
				role: "session_info",
				content: {
					session_id: "test-session",
				},
			};
		});

		const runner = new ClaudeRunner(config);

		// Run the query with a test prompt
		const prompt = "Test prompt";
		const _messages = [];

		await runner.start(prompt);

		// Check that query was called with disallowedTools
		expect(queryMock).toHaveBeenCalledTimes(1);
		const callArgs = queryMock.mock.calls[0][0];

		expect(callArgs.options).toBeDefined();
		expect(callArgs.options.disallowedTools).toEqual(["Bash", "WebFetch"]);
		expect(callArgs.options.allowedTools).toContain("Read(**)");
		expect(callArgs.options.allowedTools).toContain("Edit(**)");
	});

	it("should not pass disallowedTools when not configured", async () => {
		const config: ClaudeRunnerConfig = {
			workingDirectory: "/test",
			allowedTools: ["Read(**)", "Edit(**)"],
			// No disallowedTools
			sylasHome: "/test/sylas",
		};

		// Mock the query to capture arguments and return a session ID message
		queryMock.mockImplementation(async function* (_args: any) {
			yield {
				type: "system",
				role: "session_info",
				content: {
					session_id: "test-session",
				},
			};
		});

		const runner = new ClaudeRunner(config);
		await runner.start("Test prompt");

		// Check that query was called without disallowedTools
		expect(queryMock).toHaveBeenCalledTimes(1);
		const callArgs = queryMock.mock.calls[0][0];

		expect(callArgs.options).toBeDefined();
		expect(callArgs.options.disallowedTools).toBeUndefined();
		expect(callArgs.options.allowedTools).toContain("Read(**)");
		expect(callArgs.options.allowedTools).toContain("Edit(**)");
	});

	it("should handle empty disallowedTools array", async () => {
		const config: ClaudeRunnerConfig = {
			workingDirectory: "/test",
			allowedTools: ["Read(**)", "Edit(**)"],
			disallowedTools: [], // Empty array
			sylasHome: "/test/sylas",
		};

		// Mock the query to capture arguments and return a session ID message
		queryMock.mockImplementation(async function* (_args: any) {
			yield {
				type: "system",
				role: "session_info",
				content: {
					session_id: "test-session",
				},
			};
		});

		const runner = new ClaudeRunner(config);
		await runner.start("Test prompt");

		// Check that query was called without disallowedTools (empty array is falsy)
		expect(queryMock).toHaveBeenCalledTimes(1);
		const callArgs = queryMock.mock.calls[0][0];

		expect(callArgs.options).toBeDefined();
		expect(callArgs.options.disallowedTools).toBeUndefined();
	});

	it("should log disallowedTools when configured", async () => {
		const consoleSpy = spyOn(console, "log");

		const config: ClaudeRunnerConfig = {
			workingDirectory: "/test",
			disallowedTools: ["Bash", "SystemAccess", "DangerousTool"],
			sylasHome: "/test/sylas",
			logger: createLogger({
				component: "ClaudeRunner",
				level: LogLevel.DEBUG,
			}),
		};

		// Mock the query to capture arguments and return a session ID message
		queryMock.mockImplementation(async function* (_args: any) {
			yield {
				type: "system",
				role: "session_info",
				content: {
					session_id: "test-session",
				},
			};
		});

		const runner = new ClaudeRunner(config);
		await runner.start("Test");

		// Check that disallowedTools were logged (now at DEBUG level via logger)
		expect(consoleSpy).toHaveBeenCalledWith(
			"[DEBUG] [ClaudeRunner] Disallowed tools configured:",
			["Bash", "SystemAccess", "DangerousTool"],
		);

		consoleSpy.mockRestore();
	});
});
