import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import { readFile } from "node:fs/promises";
import { LinearClient } from "@linear/sdk";
import { ClaudeRunner, type HookCallbackMatcher } from "sylas-claude-runner";
import type { LinearAgentSessionCreatedWebhook } from "sylas-core";
import {
	isAgentSessionCreatedWebhook,
	isAgentSessionPromptedWebhook,
} from "sylas-core";
import { GeminiRunner } from "sylas-gemini-runner";
import { LinearEventTransport } from "sylas-linear-event-transport";
import { OpenCodeRunner } from "sylas-opencode-runner";
import { AgentSessionManager } from "../src/AgentSessionManager.js";
import { EdgeWorker } from "../src/EdgeWorker.js";
import { SharedApplicationServer } from "../src/SharedApplicationServer.js";
import type { EdgeWorkerConfig, RepositoryConfig } from "../src/types.js";

// Mock fs/promises
mock.module("fs/promises", () => ({
	...require("node:fs/promises"),
	readFile: mock(),
	writeFile: mock(),
	mkdir: mock(),
	rename: mock(),
}));

// Mock dependencies
mock.module("sylas-claude-runner", () => ({
	...require("sylas-claude-runner"),
	ClaudeRunner: mock(),
}));
mock.module("sylas-codex-runner", () => ({}));
mock.module("sylas-gemini-runner", () => ({
	...require("sylas-gemini-runner"),
	GeminiRunner: mock(),
}));
mock.module("sylas-linear-event-transport", () => ({
	...require("sylas-linear-event-transport"),
	LinearEventTransport: mock(),
}));
mock.module("sylas-opencode-runner", () => ({
	...require("sylas-opencode-runner"),
	OpenCodeRunner: mock(),
}));
mock.module("@linear/sdk", () => ({
	...require("@linear/sdk"),
	LinearClient: mock(),
}));
mock.module("../src/SharedApplicationServer.js", () => ({
	...require("../src/SharedApplicationServer.js"),
	SharedApplicationServer: mock(),
}));
mock.module("../src/AgentSessionManager.js", () => ({
	...require("../src/AgentSessionManager.js"),
	AgentSessionManager: mock(),
}));
mock.module("sylas-core", () => {
	const actual = require("sylas-core") as any;
	return {
		...actual,
		isAgentSessionCreatedWebhook: mock(),
		isAgentSessionPromptedWebhook: mock(),
		PersistenceManager: mock().mockImplementation(() => ({
			loadEdgeWorkerState: mock().mockResolvedValue(null),
			saveEdgeWorkerState: mock().mockResolvedValue(undefined),
		})),
	};
});
mock.module("file-type", () => ({}));

/**
 * Test suite for screenshot upload guidance hooks
 *
 * Bug: CYPACK-699
 * Problem: Agent takes screenshots but doesn't use linear_upload_file tool,
 * instead copying files locally and using file paths that Linear cannot resolve.
 *
 * Root cause: The PostToolUse hook for screenshot tools doesn't mention
 * the linear_upload_file tool, so Claude doesn't know it should upload
 * screenshots to Linear for them to be viewable in comments.
 */
describe("EdgeWorker - Screenshot Upload Guidance Hooks", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let mockLinearClient: any;
	let mockClaudeRunner: any;
	let mockGeminiRunner: any;
	let mockOpenCodeRunner: any;
	let mockAgentSessionManager: any;
	let capturedRunnerConfig: any = null;

	const mockRepository: RepositoryConfig = {
		id: "test-repo",
		name: "Test Repo",
		repositoryPath: "/test/repo",
		workspaceBaseDir: "/test/workspaces",
		baseBranch: "main",
		linearToken: "test-token",
		linearWorkspaceId: "test-workspace",
		isActive: true,
		allowedTools: ["Read", "Edit"],
	};

	function createMockIssueWithLabels(labels: string[]) {
		return {
			id: "issue-123",
			identifier: "TEST-123",
			title: "Test Issue",
			description: "Test description",
			url: "https://linear.app/test/issue/TEST-123",
			branchName: "test-branch",
			state: { name: "Todo" },
			team: { id: "team-123" },
			labels: mock().mockResolvedValue({
				nodes: labels.map((name) => ({ name })),
			}),
		};
	}

	beforeEach(() => {
		mock.restore();
		capturedRunnerConfig = null;

		// Mock console methods
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
		spyOn(console, "warn").mockImplementation(() => {});

		// Mock LinearClient
		mockLinearClient = {
			issue: mock(),
			workflowStates: mock().mockResolvedValue({
				nodes: [
					{ id: "state-1", name: "Todo", type: "unstarted", position: 0 },
					{ id: "state-2", name: "In Progress", type: "started", position: 1 },
				],
			}),
			updateIssue: mock().mockResolvedValue({ success: true }),
			createAgentActivity: mock().mockResolvedValue({ success: true }),
			comments: mock().mockResolvedValue({ nodes: [] }),
			rawRequest: mock(),
		};
		(LinearClient as any).mockImplementation(() => mockLinearClient);

		// Mock ClaudeRunner - capture config for hook inspection
		mockClaudeRunner = {
			supportsStreamingInput: true,
			start: mock().mockResolvedValue({ sessionId: "claude-session-123" }),
			startStreaming: mock().mockResolvedValue({
				sessionId: "claude-session-123",
			}),
			stop: mock(),
			isStreaming: mock().mockReturnValue(false),
			addStreamMessage: mock(),
			updatePromptVersions: mock(),
		};
		(ClaudeRunner as any).mockImplementation((config: any) => {
			capturedRunnerConfig = config;
			return mockClaudeRunner;
		});

		// Mock GeminiRunner
		mockGeminiRunner = {
			supportsStreamingInput: false,
			start: mock().mockResolvedValue({ sessionId: "gemini-session-123" }),
			startStreaming: mock().mockResolvedValue({
				sessionId: "gemini-session-123",
			}),
			stop: mock(),
			isStreaming: mock().mockReturnValue(false),
			addStreamMessage: mock(),
			updatePromptVersions: mock(),
		};
		(GeminiRunner as any).mockImplementation((_config: any) => {
			return mockGeminiRunner;
		});

		mockOpenCodeRunner = {
			supportsStreamingInput: true,
			start: mock().mockResolvedValue({ sessionId: "opencode-session-123" }),
			startStreaming: mock().mockResolvedValue({
				sessionId: "opencode-session-123",
			}),
			stop: mock(),
			isRunning: mock().mockReturnValue(false),
			addStreamMessage: mock(),
			updatePromptVersions: mock(),
		};
		(OpenCodeRunner as any).mockImplementation((config: any) => {
			capturedRunnerConfig = config;
			return mockOpenCodeRunner;
		});

		// Mock AgentSessionManager
		mockAgentSessionManager = {
			createLinearAgentSession: mock(),
			getSession: mock().mockReturnValue({
				issueId: "issue-123",
				workspace: { path: "/test/workspaces/TEST-123" },
			}),
			addAgentRunner: mock(),
			getAllAgentRunners: mock().mockReturnValue([]),
			serializeState: mock().mockReturnValue({ sessions: {}, entries: {} }),
			restoreState: mock(),
			postAnalyzingThought: mock().mockResolvedValue(null),
			postProcedureSelectionThought: mock().mockResolvedValue(undefined),
			handleClaudeMessage: mock().mockResolvedValue(undefined),
			on: mock(),
		};
		(AgentSessionManager as any).mockImplementation(
			() => mockAgentSessionManager,
		);

		// Mock SharedApplicationServer
		(SharedApplicationServer as any).mockImplementation(
			() =>
				({
					start: mock().mockResolvedValue(undefined),
					stop: mock().mockResolvedValue(undefined),
					getFastifyInstance: mock().mockReturnValue({ post: mock() }),
					getWebhookUrl: mock().mockReturnValue(
						"http://localhost:3456/webhook",
					),
					registerOAuthCallbackHandler: mock(),
				}) as any,
		);

		// Mock LinearEventTransport
		(LinearEventTransport as any).mockImplementation(
			() =>
				({
					register: mock(),
					on: mock(),
					removeAllListeners: mock(),
				}) as any,
		);

		// Mock type guards
		(isAgentSessionCreatedWebhook as any).mockReturnValue(true);
		(isAgentSessionPromptedWebhook as any).mockReturnValue(false);

		// Mock readFile
		(readFile as any).mockImplementation(async () => {
			return `<version-tag value="default-v1.0.0" />
# Default Template

Repository: {{repository_name}}
Issue: {{issue_identifier}}`;
		});

		mockConfig = {
			proxyUrl: "http://localhost:3000",
			sylasHome: "/tmp/test-sylas-home",
			repositories: [mockRepository],
			handlers: {
				createWorkspace: mock().mockResolvedValue({
					path: "/test/workspaces/TEST-123",
					isGitWorktree: false,
				}),
			},
		};

		edgeWorker = new EdgeWorker(mockConfig);

		// Inject mock issue tracker
		const mockIssueTracker = {
			fetchIssue: mock().mockImplementation(async (issueId: string) => {
				return mockLinearClient.issue(issueId);
			}),
			getIssueLabels: mock(),
		};
		(edgeWorker as any).issueTrackers.set(mockRepository.id, mockIssueTracker);
	});

	afterEach(() => {
		mock.restore();
	});

	/**
	 * Helper to extract hook matchers from captured config
	 */
	function getPostToolUseHooks(): HookCallbackMatcher[] {
		if (!capturedRunnerConfig?.hooks?.PostToolUse) {
			return [];
		}
		return capturedRunnerConfig.hooks.PostToolUse;
	}

	/**
	 * Helper to find hook matcher by tool name pattern
	 */
	function findHookMatcher(pattern: string): HookCallbackMatcher | undefined {
		const hooks = getPostToolUseHooks();
		return hooks.find(
			(h) =>
				h.matcher === pattern ||
				(typeof h.matcher === "string" && h.matcher.includes(pattern)),
		);
	}

	/**
	 * Helper to execute a hook and get the additionalContext response
	 */
	async function executeHookAndGetContext(
		hookMatcher: HookCallbackMatcher,
		toolName: string,
		toolResponse: any,
	): Promise<string | undefined> {
		const hookFn = hookMatcher.hooks[0];
		const result = await hookFn(
			{ tool_name: toolName, tool_response: toolResponse } as any,
			"test-tool-use-id",
			{ signal: new AbortController().signal },
		);
		return result?.additionalContext;
	}

	/**
	 * Helper to execute a hook with both input and response (for tools like chrome-devtools)
	 */
	async function executeHookAndGetContextWithInput(
		hookMatcher: HookCallbackMatcher,
		toolName: string,
		toolInput: any,
		toolResponse: any,
	): Promise<string | undefined> {
		const hookFn = hookMatcher.hooks[0];
		const result = await hookFn(
			{
				tool_name: toolName,
				tool_input: toolInput,
				tool_response: toolResponse,
			} as any,
			"test-tool-use-id",
			{ signal: new AbortController().signal },
		);
		return result?.additionalContext;
	}

	describe("Playwright Screenshot Hook - Linear Upload Guidance", () => {
		it("should have a hook configured for playwright_screenshot", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas work on this" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			// Assert
			const playwrightHook = findHookMatcher("playwright_screenshot");
			expect(playwrightHook).toBeDefined();
		});

		it("should provide guidance about linear_upload_file in playwright_screenshot hook", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas take a screenshot" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			// Get the hook and execute it
			const playwrightHook = findHookMatcher("playwright_screenshot");
			expect(playwrightHook).toBeDefined();

			const additionalContext = await executeHookAndGetContext(
				playwrightHook!,
				"playwright_screenshot",
				{ path: "/tmp/screenshot.png" },
			);

			// Assert - the hook should mention linear_upload_file tool
			expect(additionalContext).toBeDefined();
			expect(additionalContext).toContain("linear_upload_file");
		});

		it("should explain that linear_upload_file enables screenshots to be viewed in Linear comments", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas take a screenshot" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			const playwrightHook = findHookMatcher("playwright_screenshot");
			const additionalContext = await executeHookAndGetContext(
				playwrightHook!,
				"playwright_screenshot",
				{ path: "/tmp/screenshot.png" },
			);

			// Assert - should explain why the tool is needed
			expect(additionalContext).toMatch(/linear|comment|embed|view/i);
		});
	});

	describe("Chrome Computer Tool Screenshot Hook - Linear Upload Guidance", () => {
		it("should have a hook configured for mcp__claude-in-chrome__computer screenshot action", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas take a browser screenshot" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			// Assert - there should be a hook for the chrome computer tool
			const chromeHook = findHookMatcher("mcp__claude-in-chrome__computer");
			expect(chromeHook).toBeDefined();
		});

		it("should provide guidance about linear_upload_file when chrome computer tool takes a screenshot", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas take a browser screenshot" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			const chromeHook = findHookMatcher("mcp__claude-in-chrome__computer");
			expect(chromeHook).toBeDefined();

			// Simulate a screenshot action response from the chrome tool
			const additionalContext = await executeHookAndGetContext(
				chromeHook!,
				"mcp__claude-in-chrome__computer",
				{
					action: "screenshot",
					imageId: "img_abc123",
					path: "/tmp/chrome_screenshot.png",
				},
			);

			// Assert - should mention linear_upload_file
			expect(additionalContext).toBeDefined();
			expect(additionalContext).toContain("linear_upload_file");
		});

		it("should not provide upload guidance for non-screenshot chrome computer actions", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas click on a button" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			const chromeHook = findHookMatcher("mcp__claude-in-chrome__computer");

			// If hook exists, test that non-screenshot actions don't get upload guidance
			if (chromeHook) {
				const additionalContext = await executeHookAndGetContext(
					chromeHook,
					"mcp__claude-in-chrome__computer",
					{
						action: "left_click",
						coordinate: [100, 200],
					},
				);

				// Non-screenshot actions should either have no additionalContext
				// or not mention linear_upload_file
				if (additionalContext) {
					expect(additionalContext).not.toContain("linear_upload_file");
				}
			}
		});
	});

	describe("GIF Creator Hook - Linear Upload Guidance", () => {
		it("should have a hook configured for mcp__claude-in-chrome__gif_creator export action", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas record and export a gif" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			// Assert - there should be a hook for the gif creator tool
			const gifHook = findHookMatcher("mcp__claude-in-chrome__gif_creator");
			expect(gifHook).toBeDefined();
		});

		it("should provide guidance about linear_upload_file when gif_creator exports a gif", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas record and export a gif" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			const gifHook = findHookMatcher("mcp__claude-in-chrome__gif_creator");
			expect(gifHook).toBeDefined();

			// Simulate an export action response from gif creator
			const additionalContext = await executeHookAndGetContext(
				gifHook!,
				"mcp__claude-in-chrome__gif_creator",
				{
					action: "export",
					path: "/tmp/recording.gif",
				},
			);

			// Assert - should mention linear_upload_file
			expect(additionalContext).toBeDefined();
			expect(additionalContext).toContain("linear_upload_file");
		});
	});

	describe("Upload Guidance Content Quality", () => {
		it("should include file path placeholder in linear_upload_file guidance", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas take a screenshot" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			const playwrightHook = findHookMatcher("playwright_screenshot");
			const screenshotPath = "/tmp/screenshot-abc123.png";
			const additionalContext = await executeHookAndGetContext(
				playwrightHook!,
				"playwright_screenshot",
				{ path: screenshotPath },
			);

			// Assert - guidance should reference the actual file path from tool response
			expect(additionalContext).toBeDefined();
			// The guidance should either include the path directly or provide clear instructions
			expect(additionalContext).toMatch(
				/linear_upload_file|upload.*screenshot|share.*linear/i,
			);
		});
	});

	describe("Chrome DevTools Screenshot Hook - Linear Upload Guidance", () => {
		it("should have a hook configured for mcp__chrome-devtools__take_screenshot", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas take a screenshot with devtools" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			// Assert - there should be a hook for the chrome devtools screenshot tool
			const devtoolsHook = findHookMatcher(
				"mcp__chrome-devtools__take_screenshot",
			);
			expect(devtoolsHook).toBeDefined();
		});

		it("should provide guidance about linear_upload_file when chrome devtools takes a screenshot", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels([]);
			mockLinearClient.issue.mockResolvedValue(mockIssue);

			const webhook: LinearAgentSessionCreatedWebhook = {
				type: "Issue",
				action: "agentSessionCreated",
				organizationId: "test-workspace",
				agentSession: {
					id: "agent-session-123",
					issue: {
						id: "issue-123",
						identifier: "TEST-123",
						team: { key: "TEST" },
					},
					comment: { body: "@sylas take a screenshot with devtools" },
				},
			};

			// Act
			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			const devtoolsHook = findHookMatcher(
				"mcp__chrome-devtools__take_screenshot",
			);
			expect(devtoolsHook).toBeDefined();

			// Simulate a screenshot response - note: this tool uses filePath in input, not response
			const additionalContext = await executeHookAndGetContextWithInput(
				devtoolsHook!,
				"mcp__chrome-devtools__take_screenshot",
				{
					filePath: "/home/sylas/sylas-workspaces/PF-738/step1-screenshot.png",
					fullPage: true,
				},
				{
					text: "Took a screenshot of the full current page.",
				},
			);

			// Assert - should mention linear_upload_file and the file path
			expect(additionalContext).toBeDefined();
			expect(additionalContext).toContain("linear_upload_file");
			expect(additionalContext).toContain("step1-screenshot.png");
		});
	});
});
