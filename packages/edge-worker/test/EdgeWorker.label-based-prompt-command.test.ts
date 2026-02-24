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
import { ClaudeRunner } from "sylas-claude-runner";
import type { LinearAgentSessionCreatedWebhook } from "sylas-core";
import {
	isAgentSessionCreatedWebhook,
	isAgentSessionPromptedWebhook,
} from "sylas-core";
import { LinearEventTransport } from "sylas-linear-event-transport";
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
mock.module("sylas-linear-event-transport", () => ({
	...require("sylas-linear-event-transport"),
	LinearEventTransport: mock(),
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

describe("EdgeWorker - Label-Based Prompt Command", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let mockLinearClient: any;
	let mockClaudeRunner: any;
	let mockAgentSessionManager: any;
	let capturedPrompt: string | null = null;
	let capturedClaudeRunnerConfig: any = null;

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
		labelPrompts: {
			debugger: ["bug", "error"],
			builder: ["feature", "enhancement"],
			scoper: ["scope", "research"],
		},
	};

	beforeEach(() => {
		mock.restore();
		capturedPrompt = null;
		capturedClaudeRunnerConfig = null;

		// Mock console methods
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
		spyOn(console, "warn").mockImplementation(() => {});

		// Mock LinearClient
		mockLinearClient = {
			issue: mock().mockResolvedValue({
				id: "issue-123",
				identifier: "TEST-123",
				title: "Test Issue with Bug",
				description: "This is a bug that needs fixing",
				url: "https://linear.app/test/issue/TEST-123",
				branchName: "test-branch",
				state: { name: "Todo" },
				team: { id: "team-123" },
				labels: mock().mockResolvedValue({
					nodes: [{ name: "bug" }], // This should trigger debugger prompt
				}),
			}),
			workflowStates: mock().mockResolvedValue({
				nodes: [
					{ id: "state-1", name: "Todo", type: "unstarted", position: 0 },
					{ id: "state-2", name: "In Progress", type: "started", position: 1 },
				],
			}),
			updateIssue: mock().mockResolvedValue({ success: true }),
			createAgentActivity: mock().mockResolvedValue({ success: true }),
			comments: mock().mockResolvedValue({ nodes: [] }),
			rawRequest: mock(), // Add rawRequest to avoid validation warnings
		};
		(LinearClient as any).mockImplementation(() => mockLinearClient);

		// Mock ClaudeRunner to capture prompt
		mockClaudeRunner = {
			supportsStreamingInput: true,
			start: mock().mockImplementation((prompt: string) => {
				capturedPrompt = prompt;
				return Promise.resolve({ sessionId: "claude-session-123" });
			}),
			startStreaming: mock().mockImplementation((prompt: string) => {
				capturedPrompt = prompt;
				return Promise.resolve({ sessionId: "claude-session-123" });
			}),
			stop: mock(),
			isStreaming: mock().mockReturnValue(false),
			addStreamMessage: mock(),
			updatePromptVersions: mock(),
		};
		(ClaudeRunner as any).mockImplementation((config: any) => {
			capturedClaudeRunnerConfig = config;
			return mockClaudeRunner;
		});

		// Mock AgentSessionManager
		mockAgentSessionManager = {
			createLinearAgentSession: mock(),
			getSession: mock().mockReturnValue({
				claudeSessionId: "claude-session-123",
				workspace: { path: "/test/workspaces/TEST-123" },
				claudeRunner: mockClaudeRunner,
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

		// Mock type guards for mention-triggered sessions
		(isAgentSessionCreatedWebhook as any).mockReturnValue(true);
		(isAgentSessionPromptedWebhook as any).mockReturnValue(false);

		// Mock readFile to return debugger prompt template and label-based prompt template
		(readFile as any).mockImplementation(async (path: any) => {
			if (path.includes("debugger.md")) {
				return `<version-tag value="debugger-v1.0.0" />
# Debugger System Prompt

You are in debugger mode. Fix bugs systematically.`;
			}
			if (path.includes("label-prompt-template.md")) {
				return `<version-tag value="label-based-v1.0.0" />
# Label-Based System Prompt

Repository: {{repository_name}}
Issue: {{issue_identifier}}
Title: {{issue_title}}

You are working on this Linear issue. Use the available tools to complete the task.`;
			}
			// Return default template
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

		// Inject mock issue tracker for the test repository
		const mockIssueTracker = {
			fetchIssue: mock().mockImplementation(async (issueId: string) => {
				return mockLinearClient.issue(issueId);
			}),
			getIssueLabels: mock().mockResolvedValue([{ name: "bug" }]),
		};
		(edgeWorker as any).issueTrackers.set(mockRepository.id, mockIssueTracker);
	});

	afterEach(() => {
		mock.restore();
	});

	it("should use label-based prompt when /label-based-prompt command is mentioned", async () => {
		// Arrange
		const createdWebhook: LinearAgentSessionCreatedWebhook = {
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
				comment: {
					body: "@sylas /label-based-prompt can you work on this issue?",
				},
			},
		};

		// Act
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedPrompt).toBeDefined();
		expect(capturedPrompt).not.toBeNull();

		// Should use label-based prompt template, not mention prompt
		expect(capturedPrompt).toContain("Repository: Test Repo");
		expect(capturedPrompt).toContain("Issue: TEST-123");
		expect(capturedPrompt).toContain("Title: Test Issue with Bug");
		expect(capturedPrompt).toContain("You are working on this Linear issue");

		// Should NOT contain mention-specific text
		expect(capturedPrompt).not.toContain(
			"You were mentioned in a Linear comment",
		);
		expect(capturedPrompt).not.toContain("<mention_request>");
	});

	it("should use regular mention prompt when /label-based-prompt is NOT mentioned", async () => {
		// Arrange
		const createdWebhook: LinearAgentSessionCreatedWebhook = {
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
				comment: {
					body: "@sylas can you help me with this issue?",
				},
			},
		};

		// Act
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedPrompt).toBeDefined();
		expect(capturedPrompt).not.toBeNull();

		// Should use mention prompt template
		expect(capturedPrompt).toContain("You were mentioned in a Linear comment");
		expect(capturedPrompt).toContain("<mention_comment>");
		expect(capturedPrompt).toContain("@sylas can you help me with this issue?");

		// Should NOT contain label-based prompt template text
		expect(capturedPrompt).not.toContain(
			"You are working on this Linear issue",
		);
	});

	it("should include system prompt when /label-based-prompt is used", async () => {
		// Arrange
		const createdWebhook: LinearAgentSessionCreatedWebhook = {
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
				comment: {
					body: "@sylas /label-based-prompt please debug this issue",
				},
			},
		};

		// Act
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedClaudeRunnerConfig).toBeDefined();

		// Should include system prompt based on labels (bug -> debugger)
		expect(capturedClaudeRunnerConfig.appendSystemPrompt).toContain(
			"You are in debugger mode. Fix bugs systematically.",
		);
		// Note: LAST_MESSAGE_MARKER removed as part of three-phase execution system
	});

	it("should NOT include system prompt content for regular mentions without /label-based-prompt", async () => {
		// Arrange
		const createdWebhook: LinearAgentSessionCreatedWebhook = {
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
				comment: {
					body: "@sylas please help with this bug",
				},
			},
		};

		// Act
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedClaudeRunnerConfig).toBeDefined();

		// Should NOT include debugger system prompt for regular mentions - only the marker
		expect(capturedClaudeRunnerConfig.appendSystemPrompt).not.toContain(
			"You are in debugger mode. Fix bugs systematically.",
		);
		// Note: LAST_MESSAGE_MARKER removed as part of three-phase execution system
	});
});
