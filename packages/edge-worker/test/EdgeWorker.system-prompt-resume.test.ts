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
import type {
	LinearAgentSessionCreatedWebhook,
	LinearAgentSessionPromptedWebhook,
} from "sylas-core";
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

describe("EdgeWorker - System Prompt Resume", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let mockLinearClient: any;
	let mockClaudeRunner: any;
	let mockAgentSessionManager: any;
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

		// Mock ClaudeRunner to capture config
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
			capturedClaudeRunnerConfig = config;
			return mockClaudeRunner;
		});

		// Mock AgentSessionManager
		mockAgentSessionManager = {
			createLinearAgentSession: mock(),
			getSession: mock().mockReturnValue({
				id: "agent-session-123",
				externalSessionId: "agent-session-123",
				claudeSessionId: "claude-session-123",
				issueId: "issue-123",
				issueContext: {
					trackerId: "linear",
					issueId: "issue-123",
					issueIdentifier: "TEST-123",
				},
				issue: {
					id: "issue-123",
					identifier: "TEST-123",
					title: "Test Issue with Bug",
					branchName: "test-branch",
				},
				workspace: { path: "/test/workspaces/TEST-123" },
				claudeRunner: mockClaudeRunner,
			}),
			addAgentRunner: mock(),
			getAllClaudeRunners: mock().mockReturnValue([]),
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
		(isAgentSessionCreatedWebhook as any).mockReturnValue(false);
		(isAgentSessionPromptedWebhook as any).mockReturnValue(false);

		// Mock readFile to return debugger prompt
		(readFile as any).mockImplementation(async (path: any) => {
			if (path.includes("debugger.md")) {
				return `<version-tag value="debugger-v1.0.0" />
# Debugger System Prompt

You are in debugger mode. Fix bugs systematically.`;
			}
			// Return default prompt template
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

	it("should include system prompt when creating initial ClaudeRunner", async () => {
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
			},
		};

		(isAgentSessionCreatedWebhook as any).mockReturnValue(true);

		// Act - call the private method directly since we're testing internal behavior
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedClaudeRunnerConfig).toBeDefined();
		expect(capturedClaudeRunnerConfig.appendSystemPrompt).toContain(
			"You are in debugger mode. Fix bugs systematically.",
		);
		// Note: LAST_MESSAGE_MARKER removed as part of three-phase execution system
	});

	it("should include system prompt when resuming ClaudeRunner (bug fixed)", async () => {
		// Reset mocks
		(isAgentSessionCreatedWebhook as any).mockReturnValue(false);
		(isAgentSessionPromptedWebhook as any).mockReturnValue(true);
		capturedClaudeRunnerConfig = null;

		// Arrange
		const promptedWebhook: LinearAgentSessionPromptedWebhook = {
			type: "Issue",
			action: "agentSessionPrompted",
			organizationId: "test-workspace",
			agentSession: {
				id: "agent-session-123",
				issue: {
					id: "issue-123",
					identifier: "TEST-123",
					team: { key: "TEST" },
				},
			},
			agentActivity: {
				content: {
					type: "user",
					body: "Please fix this bug",
				},
			},
		};

		// IMPORTANT: Pre-cache the repository for this issue (simulating that a session was already created)
		// This is required for prompted webhooks which use getCachedRepository
		const repositoryRouter = (edgeWorker as any).repositoryRouter;
		repositoryRouter
			.getIssueRepositoryCache()
			.set("issue-123", mockRepository.id);

		// Act - call the private method directly
		const handleUserPromptedAgentActivity = (
			edgeWorker as any
		).handleUserPromptedAgentActivity.bind(edgeWorker);
		await handleUserPromptedAgentActivity(promptedWebhook, [mockRepository]);

		// Assert - Bug is now fixed: system prompt is included!
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedClaudeRunnerConfig).toBeDefined();
		// System prompt should include BOTH the debugger prompt AND the marker
		expect(capturedClaudeRunnerConfig.appendSystemPrompt).toContain(
			"You are in debugger mode. Fix bugs systematically.",
		);
		// Note: LAST_MESSAGE_MARKER removed as part of three-phase execution system
	});
});
