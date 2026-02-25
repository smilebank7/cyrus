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

describe("EdgeWorker - Parent Branch Handling", () => {
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

		// Mock LinearClient - default issue without parent
		mockLinearClient = {
			issue: mock().mockResolvedValue({
				id: "issue-123",
				identifier: "TEST-123",
				title: "Test Issue",
				description: "This is a test issue",
				url: "https://linear.app/test/issue/TEST-123",
				branchName: "test-branch",
				state: Promise.resolve({ name: "Todo" }),
				team: { id: "team-123" },
				labels: mock().mockResolvedValue({
					nodes: [],
				}),
				parent: Promise.resolve(null), // No parent by default
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
				claudeSessionId: "claude-session-123",
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

		// Mock readFile to return default prompt
		(readFile as any).mockImplementation(async (_path: any) => {
			return `<version-tag value="default-v1.0.0" />
# Default Template

Repository: {{repository_name}}
Issue: {{issue_identifier}}
Base Branch: {{base_branch}}`;
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
		// The EdgeWorker constructor creates real LinearIssueTrackerService instances,
		// but we need to replace them with mocks for testing
		const mockIssueTracker = {
			fetchIssue: mock().mockImplementation(async (issueId: string) => {
				// Return the same mock data as mockLinearClient.issue()
				return mockLinearClient.issue(issueId);
			}),
			getIssueLabels: mock().mockResolvedValue([]),
		};
		(edgeWorker as any).issueTrackers.set(mockRepository.id, mockIssueTracker);

		// Mock branchExists to always return true so parent branches are used
		spyOn((edgeWorker as any).gitService, "branchExists").mockResolvedValue(
			true,
		);
	});

	afterEach(() => {
		mock.restore();
	});

	it("should use repository baseBranch when issue has no parent", async () => {
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

		// Act
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedClaudeRunnerConfig).toBeDefined();

		// Check that startStreaming was called with a prompt containing the correct base branch
		expect(mockClaudeRunner.startStreaming).toHaveBeenCalled();
		const promptArg = mockClaudeRunner.startStreaming.mock.calls[0][0];
		expect(promptArg).toContain("Base Branch: main"); // Should contain the repository's base branch
	});

	it("should use parent issue branch when issue has a parent", async () => {
		// Arrange - Mock issue with parent
		mockLinearClient.issue.mockResolvedValue({
			id: "issue-123",
			identifier: "TEST-123",
			title: "Test Issue",
			description: "This is a test issue",
			url: "https://linear.app/test/issue/TEST-123",
			branchName: "test-branch",
			state: Promise.resolve({ name: "Todo" }),
			team: { id: "team-123" },
			labels: mock().mockResolvedValue({
				nodes: [],
			}),
			parent: Promise.resolve({
				id: "parent-issue-456",
				identifier: "TEST-456",
				branchName: "parent-feature-branch",
			}),
		});

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

		// Act
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedClaudeRunnerConfig).toBeDefined();

		// Check that startStreaming was called with a prompt containing the parent branch
		expect(mockClaudeRunner.startStreaming).toHaveBeenCalled();
		const promptArg = mockClaudeRunner.startStreaming.mock.calls[0][0];
		expect(promptArg).toContain("Base Branch: parent-feature-branch"); // Should contain the parent's branch
	});

	it("should fall back to repository baseBranch when parent has no branch name", async () => {
		// Arrange - Mock issue with parent but no branch name
		mockLinearClient.issue.mockResolvedValue({
			id: "issue-123",
			identifier: "TEST-123",
			title: "Test Issue",
			description: "This is a test issue",
			url: "https://linear.app/test/issue/TEST-123",
			branchName: "test-branch",
			state: Promise.resolve({ name: "Todo" }),
			team: { id: "team-123" },
			labels: mock().mockResolvedValue({
				nodes: [],
			}),
			parent: Promise.resolve({
				id: "parent-issue-456",
				identifier: "TEST-456",
				branchName: null, // Parent has no branch name
				title: "Parent Issue Title", // Add title so branch name can be generated
			}),
		});

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

		// Act
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedClaudeRunnerConfig).toBeDefined();

		// Check that startStreaming was called with a prompt containing the generated parent branch name
		expect(mockClaudeRunner.startStreaming).toHaveBeenCalled();
		const promptArg = mockClaudeRunner.startStreaming.mock.calls[0][0];
		expect(promptArg).toContain("Base Branch: TEST-456-parent-issue-title"); // Should use generated branch name
	});

	it("should handle deeply nested parent issues", async () => {
		// Arrange - Mock issue with nested parent structure
		mockLinearClient.issue.mockResolvedValue({
			id: "issue-123",
			identifier: "TEST-123",
			title: "Test Issue",
			description: "This is a test issue",
			url: "https://linear.app/test/issue/TEST-123",
			branchName: "test-branch",
			state: Promise.resolve({ name: "Todo" }),
			team: { id: "team-123" },
			labels: mock().mockResolvedValue({
				nodes: [],
			}),
			parent: Promise.resolve({
				id: "parent-issue-456",
				identifier: "TEST-456",
				branchName: "parent-branch-456",
				parent: {
					id: "grandparent-issue-789",
					identifier: "TEST-789",
					branchName: "grandparent-branch-789",
				},
			}),
		});

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

		// Act
		const handleAgentSessionCreatedWebhook = (
			edgeWorker as any
		).handleAgentSessionCreatedWebhook.bind(edgeWorker);
		await handleAgentSessionCreatedWebhook(createdWebhook, [mockRepository]);

		// Assert - should use immediate parent branch, not grandparent
		expect(ClaudeRunner as any).toHaveBeenCalled();
		expect(capturedClaudeRunnerConfig).toBeDefined();

		// Check that startStreaming was called with a prompt containing the immediate parent branch
		expect(mockClaudeRunner.startStreaming).toHaveBeenCalled();
		const promptArg = mockClaudeRunner.startStreaming.mock.calls[0][0];
		expect(promptArg).toContain("Base Branch: parent-branch-456"); // Should use immediate parent
		expect(promptArg).not.toContain("grandparent-branch-789"); // Should not contain grandparent
	});
});
