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
import { CodexRunner } from "sylas-codex-runner";
import type { LinearAgentSessionCreatedWebhook } from "sylas-core";
import {
	isAgentSessionCreatedWebhook,
	isAgentSessionPromptedWebhook,
} from "sylas-core";
import { CursorRunner } from "sylas-cursor-runner";
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
mock.module("sylas-codex-runner", () => ({
	...require("sylas-codex-runner"),
	CodexRunner: mock(),
}));
mock.module("sylas-cursor-runner", () => ({
	...require("sylas-cursor-runner"),
	CursorRunner: mock(),
}));
mock.module("sylas-gemini-runner", () => ({
	...require("sylas-gemini-runner"),
	GeminiRunner: mock(),
}));
mock.module("sylas-opencode-runner", () => ({
	...require("sylas-opencode-runner"),
	OpenCodeRunner: mock(),
}));
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

describe("EdgeWorker - Runner Selection Based on Labels", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let mockLinearClient: any;
	let mockClaudeRunner: any;
	let mockCodexRunner: any;
	let mockCursorRunner: any;
	let mockGeminiRunner: any;
	let mockOpenCodeRunner: any;
	let mockAgentSessionManager: any;
	let capturedRunnerType:
		| "claude"
		| "gemini"
		| "codex"
		| "cursor"
		| "opencode"
		| null = null;
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

	function createMockIssueWithLabels(
		labels: string[],
		description: string = "Test description",
	) {
		return {
			id: "issue-123",
			identifier: "TEST-123",
			title: "Test Issue",
			description,
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
		(ClaudeRunner as any).mockClear?.();
		(GeminiRunner as any).mockClear?.();
		(CodexRunner as any).mockClear?.();
		(CursorRunner as any).mockClear?.();
		(OpenCodeRunner as any).mockClear?.();
		(LinearClient as any).mockClear?.();
		(AgentSessionManager as any).mockClear?.();
		(SharedApplicationServer as any).mockClear?.();
		(LinearEventTransport as any).mockClear?.();
		(isAgentSessionCreatedWebhook as any).mockClear?.();
		(isAgentSessionPromptedWebhook as any).mockClear?.();
		(readFile as any).mockClear?.();
		capturedRunnerType = null;
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

		// Mock ClaudeRunner
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
			capturedRunnerType = "claude";
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
		(GeminiRunner as any).mockImplementation((config: any) => {
			capturedRunnerType = "gemini";
			capturedRunnerConfig = config;
			return mockGeminiRunner;
		});

		// Mock CodexRunner
		mockCodexRunner = {
			supportsStreamingInput: false,
			start: mock().mockResolvedValue({ sessionId: "codex-session-123" }),
			startStreaming: mock().mockResolvedValue({
				sessionId: "codex-session-123",
			}),
			stop: mock(),
			isStreaming: mock().mockReturnValue(false),
			addStreamMessage: mock(),
			updatePromptVersions: mock(),
		};
		(CodexRunner as any).mockImplementation((config: any) => {
			capturedRunnerType = "codex";
			capturedRunnerConfig = config;
			return mockCodexRunner;
		});

		// Mock CursorRunner
		mockCursorRunner = {
			supportsStreamingInput: false,
			start: mock().mockResolvedValue({ sessionId: "cursor-session-123" }),
			startStreaming: mock().mockResolvedValue({
				sessionId: "cursor-session-123",
			}),
			stop: mock(),
			isStreaming: mock().mockReturnValue(false),
			addStreamMessage: mock(),
			updatePromptVersions: mock(),
		};
		(CursorRunner as any).mockImplementation((config: any) => {
			capturedRunnerType = "cursor";
			capturedRunnerConfig = config;
			return mockCursorRunner;
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
			capturedRunnerType = "opencode";
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
		// Clear mock call counts accumulated during EdgeWorker construction
		(ClaudeRunner as any).mockClear?.();
		(GeminiRunner as any).mockClear?.();
		(CodexRunner as any).mockClear?.();
		(CursorRunner as any).mockClear?.();
		(OpenCodeRunner as any).mockClear?.();
		(LinearClient as any).mockClear?.();
		(AgentSessionManager as any).mockClear?.();
		(SharedApplicationServer as any).mockClear?.();
		(LinearEventTransport as any).mockClear?.();
	});

	afterEach(() => {
		mock.restore();
	});

	describe("Gemini Runner Selection", () => {
		it("should select Gemini runner when 'gemini' label is present", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["gemini"]);
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
			expect(capturedRunnerType).toBe("gemini");
			expect(GeminiRunner).toHaveBeenCalled();
		});

		it("should select Gemini runner with gemini-2.5-pro model when 'gemini-2.5-pro' label is present", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["gemini-2.5-pro"]);
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
			expect(capturedRunnerType).toBe("gemini");
			expect(GeminiRunner).toHaveBeenCalled();
			expect(capturedRunnerConfig.model).toBe("gemini-2.5-pro");
		});

		it("should select Gemini runner when 'gemini-2.5-flash' label is present", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["gemini-2.5-flash"]);
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
			expect(capturedRunnerType).toBe("gemini");
			expect(GeminiRunner).toHaveBeenCalled();
		});

		it("should select Gemini runner when 'gemini-3-pro' label is present", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["gemini-3-pro"]);
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
			expect(capturedRunnerType).toBe("gemini");
			expect(GeminiRunner).toHaveBeenCalled();
			expect(capturedRunnerConfig.model).toBe("gemini-3-pro-preview");
		});
	});

	describe("Codex Runner Selection", () => {
		it("should select Codex runner when 'codex' label is present", async () => {
			const mockIssue = createMockIssueWithLabels(["codex"]);
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

			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			expect(capturedRunnerType).toBe("codex");
			expect(CodexRunner).toHaveBeenCalled();
		});

		it("should select Codex runner with gpt-5-codex model when 'gpt-5-codex' label is present", async () => {
			const mockIssue = createMockIssueWithLabels(["gpt-5-codex"]);
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

			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			expect(capturedRunnerType).toBe("codex");
			expect(CodexRunner).toHaveBeenCalled();
			expect(capturedRunnerConfig.model).toBe("gpt-5-codex");
		});

		it("should select Codex runner with gpt-5.2-codex model when both agent and model labels are present", async () => {
			const mockIssue = createMockIssueWithLabels(["codex", "gpt-5.2-codex"]);
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

			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			expect(capturedRunnerType).toBe("codex");
			expect(CodexRunner).toHaveBeenCalled();
			expect(capturedRunnerConfig.model).toBe("gpt-5.2-codex");
		});
	});

	describe("Cursor Runner Selection", () => {
		it("should select Cursor runner when 'cursor' label is present", async () => {
			const mockIssue = createMockIssueWithLabels(["cursor"]);
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

			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			expect(capturedRunnerType).toBe("cursor");
			expect(CursorRunner).toHaveBeenCalled();
		});
	});

	describe("Description Tag Selection", () => {
		it("should select agent from [agent=...] description tag", async () => {
			const mockIssue = createMockIssueWithLabels(
				["bug"],
				"Work item\\n\\n[agent=codex]",
			);
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

			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			expect(capturedRunnerType).toBe("codex");
			expect(CodexRunner).toHaveBeenCalled();
		});

		it("should select Cursor runner from [agent=cursor] description tag", async () => {
			const mockIssue = createMockIssueWithLabels(
				["bug"],
				"Work item\\n\\n[agent=cursor]",
			);
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

			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			expect(capturedRunnerType).toBe("cursor");
			expect(CursorRunner).toHaveBeenCalled();
		});

		it("should select model from [model=...] description tag and infer runner", async () => {
			const mockIssue = createMockIssueWithLabels(
				["bug"],
				"Work item\\n\\n[model=gpt-5.2-codex]",
			);
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

			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			expect(capturedRunnerType).toBe("codex");
			expect(CodexRunner).toHaveBeenCalled();
			expect(capturedRunnerConfig.model).toBe("gpt-5.2-codex");
		});

		it("should let description tags override labels", async () => {
			const mockIssue = createMockIssueWithLabels(
				["claude", "sonnet"],
				"Work item\\n\\n[agent=gemini]\\n[model=gemini-2.5-flash]",
			);
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

			await (edgeWorker as any).handleAgentSessionCreatedWebhook(webhook, [
				mockRepository,
			]);

			expect(capturedRunnerType).toBe("gemini");
			expect(GeminiRunner).toHaveBeenCalled();
			expect(capturedRunnerConfig.model).toBe("gemini-2.5-flash");
		});
	});

	describe("Claude Runner Selection", () => {
		it("should select Claude runner when 'claude' label is present", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["claude"]);
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
			expect(capturedRunnerType).toBe("claude");
			expect(ClaudeRunner).toHaveBeenCalled();
		});

		it("should select Claude runner when 'sonnet' label is present", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["sonnet"]);
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
			expect(capturedRunnerType).toBe("claude");
			expect(ClaudeRunner).toHaveBeenCalled();
		});

		it("should select Claude runner when 'opus' label is present", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["opus"]);
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
			expect(capturedRunnerType).toBe("claude");
			expect(ClaudeRunner).toHaveBeenCalled();

			expect(capturedRunnerConfig.model).toBe("opus");
		});
	});

	describe("Default Runner Selection", () => {
		it("should default to OpenCode runner when no runner-related labels are present", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["bug", "feature"]);
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
			expect(capturedRunnerType).toBe("opencode");
			expect(OpenCodeRunner).toHaveBeenCalled();
			expect(ClaudeRunner).not.toHaveBeenCalled();
			expect(GeminiRunner).not.toHaveBeenCalled();
		});

		it("should default to OpenCode runner when issue has no labels", async () => {
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
			expect(capturedRunnerType).toBe("opencode");
			expect(OpenCodeRunner).toHaveBeenCalled();
			expect(ClaudeRunner).not.toHaveBeenCalled();
			expect(GeminiRunner).not.toHaveBeenCalled();
		});
	});

	describe("Case Insensitivity", () => {
		it("should select Gemini runner with mixed-case 'Gemini' label", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["Gemini"]);
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
			expect(capturedRunnerType).toBe("gemini");
			expect(GeminiRunner).toHaveBeenCalled();
		});

		it("should select Claude runner with uppercase 'CLAUDE' label", async () => {
			// Arrange
			const mockIssue = createMockIssueWithLabels(["CLAUDE"]);
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
			expect(capturedRunnerType).toBe("claude");
			expect(ClaudeRunner).toHaveBeenCalled();
		});
	});

	describe("Session Continuation Model Override Validation", () => {
		it("should detect and warn about cross-runner model override (opus on gemini session)", () => {
			// Arrange
			const labels = ["opus"]; // Claude model label

			// Act
			const runnerSelection = (edgeWorker as any).determineRunnerSelection(
				labels,
			);

			// Assert
			expect(runnerSelection.runnerType).toBe("claude");
			expect(runnerSelection.modelOverride).toBe("opus");

			// The validation logic in resumeAgentSession will detect this mismatch
			// and prevent applying "opus" to a Gemini session
		});

		it("should allow same-runner model override (gemini-3-pro on gemini session)", () => {
			// Arrange
			const labels = ["gemini-3-pro"];

			// Act
			const runnerSelection = (edgeWorker as any).determineRunnerSelection(
				labels,
			);

			// Assert
			expect(runnerSelection.runnerType).toBe("gemini");
			expect(runnerSelection.modelOverride).toBe("gemini-3-pro-preview");

			// The validation logic will allow this since both label and session use gemini
		});

		it("should correctly identify runner type mismatch between label and session", () => {
			// This test verifies the logic that would run in resumeAgentSession
			const labels = ["sonnet"]; // Claude label
			const runnerSelection = (edgeWorker as any).determineRunnerSelection(
				labels,
			);

			// If continuing a Gemini session (hasGeminiSession=true, hasClaudeSession=false)
			const useClaudeRunner = false; // Would be determined by session IDs
			const actualRunnerType = useClaudeRunner ? "claude" : "gemini";
			const labelRunnerType = runnerSelection.runnerType;

			// Verify mismatch detection
			expect(labelRunnerType).toBe("claude");
			expect(actualRunnerType).toBe("gemini");
			expect(labelRunnerType).not.toBe(actualRunnerType);

			// This mismatch would trigger the warning in resumeAgentSession
		});

		it("should preserve explicit agent and ignore conflicting model", () => {
			const runnerSelection = (edgeWorker as any).determineRunnerSelection([
				"claude",
				"gpt-5-codex",
			]);

			expect(runnerSelection.runnerType).toBe("claude");
			expect(runnerSelection.modelOverride).toBe("opus");
		});
	});

	describe("Session Continuation", () => {
		it("should pass cursorSessionId as resumeSessionId for cursor continuations", async () => {
			const mockIssue = createMockIssueWithLabels(["cursor"]);
			spyOn(edgeWorker as any, "fetchFullIssueDetails").mockResolvedValue(
				mockIssue,
			);
			spyOn(edgeWorker as any, "buildSessionPrompt").mockResolvedValue(
				"Resume this session",
			);
			spyOn(edgeWorker as any, "savePersistedState").mockResolvedValue(
				undefined,
			);

			const session: any = {
				issueId: "issue-123",
				workspace: { path: "/test/workspaces/TEST-123" },
				issue: { identifier: "TEST-123" },
				cursorSessionId: "cursor-session-existing",
			};

			await (edgeWorker as any).resumeAgentSession(
				session,
				mockRepository,
				"agent-session-123",
				mockAgentSessionManager,
				"follow-up prompt",
			);

			expect(capturedRunnerType).toBe("cursor");
			expect(capturedRunnerConfig.resumeSessionId).toBe(
				"cursor-session-existing",
			);
			expect(mockCursorRunner.start).toHaveBeenCalledOnce();
		});
	});
});
