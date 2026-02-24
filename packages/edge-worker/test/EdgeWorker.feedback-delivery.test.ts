import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import { LinearClient } from "@linear/sdk";
import { ClaudeRunner } from "sylas-claude-runner";
import { LinearEventTransport } from "sylas-linear-event-transport";
import { createSylasToolsServer } from "sylas-mcp-tools";
import { AgentSessionManager } from "../src/AgentSessionManager.js";
import { EdgeWorker } from "../src/EdgeWorker.js";
import { SharedApplicationServer } from "../src/SharedApplicationServer.js";
import type { EdgeWorkerConfig, RepositoryConfig } from "../src/types.js";

// Mock all dependencies
mock.module("fs/promises", () => ({
	...require("node:fs/promises"),
}));
mock.module("sylas-claude-runner", () => ({
	...require("sylas-claude-runner"),
	ClaudeRunner: mock(),
}));
mock.module("sylas-mcp-tools", () => ({
	...require("sylas-mcp-tools"),
	createSylasToolsServer: mock(),
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
		PersistenceManager: mock().mockImplementation(() => ({
			loadEdgeWorkerState: mock().mockResolvedValue(null),
			saveEdgeWorkerState: mock().mockResolvedValue(undefined),
		})),
	};
});

describe("EdgeWorker - Feedback Delivery", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let mockAgentSessionManager: any;
	let mockChildAgentSessionManager: any;
	let mockClaudeRunner: any;
	let resumeAgentSessionSpy: any;
	let mockOnFeedbackDelivery: any;
	let mockOnSessionCreated: any;

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
		labelPrompts: {},
	};

	beforeEach(() => {
		mock.restore();
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});

		// Setup callbacks to be captured
		mockOnFeedbackDelivery = mock();
		mockOnSessionCreated = mock();

		// Mock createSylasToolsServer to return a proper structure
		(createSylasToolsServer as any).mockImplementation((_token, options) => {
			// Capture the callbacks
			if (options?.onFeedbackDelivery) {
				mockOnFeedbackDelivery = options.onFeedbackDelivery;
			}
			if (options?.onSessionCreated) {
				mockOnSessionCreated = options.onSessionCreated;
			}

			// Return a mock MCP server shape
			return {
				server: {},
			} as any;
		});

		// Mock ClaudeRunner
		mockClaudeRunner = {
			supportsStreamingInput: true,
			startStreaming: mock().mockResolvedValue({
				sessionId: "claude-session-123",
			}),
			stop: mock(),
			isStreaming: mock().mockReturnValue(false),
		};
		(ClaudeRunner as any).mockImplementation(() => mockClaudeRunner);

		// Mock child session manager
		mockChildAgentSessionManager = {
			hasAgentRunner: mock().mockReturnValue(true),
			getSession: mock().mockReturnValue({
				issueId: "CHILD-456",
				claudeSessionId: "child-claude-session-456",
				workspace: { path: "/test/workspaces/CHILD-456" },
				claudeRunner: mockClaudeRunner,
			}),
			getAgentRunner: mock().mockReturnValue(mockClaudeRunner),
			postAnalyzingThought: mock().mockResolvedValue(undefined),
			postProcedureSelectionThought: mock().mockResolvedValue(undefined),
			on: mock(), // EventEmitter method
		};

		// Mock parent session manager (for different repository)
		mockAgentSessionManager = {
			hasAgentRunner: mock().mockReturnValue(false),
			getSession: mock().mockReturnValue(null),
			handleClaudeMessage: mock().mockResolvedValue(undefined),
			on: mock(),
		};

		// Mock AgentSessionManager constructor
		(AgentSessionManager as any).mockImplementation(
			(_linearClient, ..._args) => {
				// Return different managers based on some condition
				// In real usage, these would be created per repository
				return mockAgentSessionManager;
			},
		);

		// Mock other dependencies
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

		(LinearEventTransport as any).mockImplementation(
			() =>
				({
					register: mock(),
					on: mock(),
					removeAllListeners: mock(),
				}) as any,
		);

		(LinearClient as any).mockImplementation(
			() =>
				({
					users: {
						me: mock().mockResolvedValue({
							id: "user-123",
							name: "Test User",
						}),
					},
				}) as any,
		);

		mockConfig = {
			proxyUrl: "http://localhost:3000",
			sylasHome: "/tmp/test-sylas-home",
			repositories: [mockRepository],
			handlers: {
				createWorkspace: mock().mockResolvedValue({
					path: "/test/workspaces/CHILD-456",
					isGitWorktree: false,
				}),
			},
		};

		edgeWorker = new EdgeWorker(mockConfig);

		const fullDevelopmentProcedure = (
			edgeWorker as any
		).procedureAnalyzer.getProcedure("full-development");
		if (!fullDevelopmentProcedure) {
			throw new Error("full-development procedure not found");
		}
		spyOn(
			(edgeWorker as any).procedureAnalyzer,
			"determineRoutine",
		).mockResolvedValue({
			classification: "code",
			procedure: fullDevelopmentProcedure,
			reasoning: "mocked for feedback tests",
		});

		// Spy on resumeAgentSession method
		resumeAgentSessionSpy = spyOn(
			edgeWorker as any,
			"resumeAgentSession",
		).mockResolvedValue(undefined);

		// Setup parent-child mapping
		(edgeWorker as any).childToParentAgentSession.set(
			"child-session-456",
			"parent-session-123",
		);

		// Setup repository managers
		(edgeWorker as any).agentSessionManagers.set(
			"test-repo",
			mockChildAgentSessionManager,
		);
		(edgeWorker as any).repositories.set("test-repo", mockRepository);
	});

	afterEach(() => {
		mock.restore();
	});

	describe("Parent to Child Feedback Flow", () => {
		it("should deliver feedback FROM parent TO child session and resume the child", async () => {
			// Arrange
			const childSessionId = "child-session-456";
			const feedbackMessage =
				"Please revise your approach and focus on the error handling";
			const parentSessionId = "parent-session-123";

			// Build MCP config which will trigger createSylasToolsServer
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				parentSessionId,
			);

			// Act - Call the captured feedback delivery callback
			const result = await mockOnFeedbackDelivery(
				childSessionId,
				feedbackMessage,
			);

			// Assert
			expect(result).toBe(true);

			// Wait for the async handlePromptWithStreamingCheck to complete (fire-and-forget pattern)
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(resumeAgentSessionSpy).toHaveBeenCalledOnce();

			const resumeArgs = resumeAgentSessionSpy.mock.calls[0];
			const [
				childSession,
				repo,
				sessionId,
				_manager,
				prompt,
				attachmentManifest,
				isNewSession,
				additionalAllowedDirectories,
			] = resumeArgs;

			// Verify the CHILD session is resumed, not the parent
			expect(sessionId).toBe(childSessionId);
			expect(childSession.issueId).toBe("CHILD-456");
			expect(childSession.claudeSessionId).toBe("child-claude-session-456");

			// Verify correct prompt format with enhanced markdown: feedback FROM parent TO child
			expect(prompt).toBe(
				`## Received feedback from orchestrator\n\n---\n\n${feedbackMessage}\n\n---`,
			);

			// Verify repository is passed correctly
			expect(repo).toBe(mockRepository);

			// Verify no attachments for feedback
			expect(attachmentManifest).toBe("");

			// Verify it's not a new session
			expect(isNewSession).toBe(false);

			// Verify no additional allowed directories for feedback (empty array)
			expect(additionalAllowedDirectories).toEqual([]);
		});

		it("should handle feedback delivery when parent session ID is unknown", async () => {
			// Arrange - Remove parent mapping to test unknown parent scenario
			(edgeWorker as any).childToParentAgentSession.delete("child-session-456");

			const childSessionId = "child-session-456";
			const feedbackMessage = "Test feedback without known parent";

			// Build MCP config which will trigger createSylasToolsServer
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				undefined, // No parent session ID
			);

			// Act - Call the captured feedback delivery callback
			const result = await mockOnFeedbackDelivery(
				childSessionId,
				feedbackMessage,
			);

			// Assert - Should still work but with generic parent reference
			expect(result).toBe(true);

			// Wait for the async handlePromptWithStreamingCheck to complete (fire-and-forget pattern)
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(resumeAgentSessionSpy).toHaveBeenCalledOnce();

			const prompt = resumeAgentSessionSpy.mock.calls[0][4];
			expect(prompt).toBe(
				`## Received feedback from orchestrator\n\n---\n\n${feedbackMessage}\n\n---`,
			);
		});

		it("should return false when child session is not found in any repository", async () => {
			// Arrange
			mockChildAgentSessionManager.hasAgentRunner.mockReturnValue(false);

			const childSessionId = "nonexistent-child-session";
			const feedbackMessage = "This should fail";

			// Build MCP config which will trigger createSylasToolsServer
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				"parent-session-123",
			);

			// Act - Call the captured feedback delivery callback
			const result = await mockOnFeedbackDelivery(
				childSessionId,
				feedbackMessage,
			);

			// Assert
			expect(result).toBe(false);
			expect(resumeAgentSessionSpy).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining(
					`Child session ${childSessionId} not found in any repository`,
				),
			);
		});

		it("should return false when child session data is not found in manager", async () => {
			// Arrange
			mockChildAgentSessionManager.getSession.mockReturnValue(null);

			const childSessionId = "child-session-456";
			const feedbackMessage = "This should also fail";

			// Build MCP config which will trigger createSylasToolsServer
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				"parent-session-123",
			);

			// Act - Call the captured feedback delivery callback
			const result = await mockOnFeedbackDelivery(
				childSessionId,
				feedbackMessage,
			);

			// Assert
			expect(result).toBe(false);
			expect(resumeAgentSessionSpy).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining(`Child session ${childSessionId} not found`),
			);
		});

		it("should handle resumeAgentSession errors gracefully", async () => {
			// Arrange
			resumeAgentSessionSpy.mockRejectedValue(new Error("Resume failed"));

			const childSessionId = "child-session-456";
			const feedbackMessage = "This will cause resume to fail";

			// Build MCP config which will trigger createSylasToolsServer
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				"parent-session-123",
			);

			// Act - Call the captured feedback delivery callback
			const result = await mockOnFeedbackDelivery(
				childSessionId,
				feedbackMessage,
			);

			// Assert - Now returns true immediately (fire-and-forget)
			expect(result).toBe(true);

			// Wait for the async handlePromptWithStreamingCheck to complete (fire-and-forget pattern)
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(resumeAgentSessionSpy).toHaveBeenCalledOnce();

			// Wait a bit for the async error handling to occur
			await new Promise((resolve) => setTimeout(resolve, 100));

			// The error is logged asynchronously
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining(`Failed to process feedback in child session:`),
				expect.any(Error),
			);
		});

		it("should find child session across multiple repositories", async () => {
			// Arrange - Setup multiple repositories
			const repo2: RepositoryConfig = {
				...mockRepository,
				id: "test-repo-2",
				name: "Test Repo 2",
			};

			const mockRepo2Manager = {
				hasAgentRunner: mock().mockReturnValue(false),
				getSession: mock().mockReturnValue(null),
			};

			// First repository doesn't have the session
			(edgeWorker as any).agentSessionManagers.set(
				"test-repo-2",
				mockRepo2Manager,
			);
			(edgeWorker as any).repositories.set("test-repo-2", repo2);

			// Adjust mock to make first repo not have it, second repo has it
			mockRepo2Manager.hasAgentRunner.mockReturnValue(false);
			mockChildAgentSessionManager.hasAgentRunner.mockReturnValue(true);

			const childSessionId = "child-session-456";
			const feedbackMessage = "Test feedback across repositories";

			// Build MCP config which will trigger createSylasToolsServer
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				"parent-session-123",
			);

			// Act - Call the captured feedback delivery callback
			const result = await mockOnFeedbackDelivery(
				childSessionId,
				feedbackMessage,
			);

			// Assert - Should find the child in the correct repository
			expect(result).toBe(true);

			// Wait for the async handlePromptWithStreamingCheck to complete (fire-and-forget pattern)
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(resumeAgentSessionSpy).toHaveBeenCalledOnce();

			// Verify the child was found in one of the repositories
			const hasAgentRunnerCalls =
				mockRepo2Manager.hasAgentRunner.mock.calls.length +
				mockChildAgentSessionManager.hasAgentRunner.mock.calls.length;
			expect(hasAgentRunnerCalls).toBeGreaterThan(0);
		});
	});

	describe("Integration with sylas-tools server", () => {
		it("should properly configure feedback delivery callback in MCP config", () => {
			// Arrange
			const parentSessionId = "parent-session-123";

			// Act
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				parentSessionId,
			);

			// Assert
			expect(_mcpConfig).toHaveProperty("sylas-tools");

			// Verify createSylasToolsServer was called with correct options
			expect(createSylasToolsServer).toHaveBeenCalledWith(
				mockRepository.linearToken,
				expect.objectContaining({
					parentSessionId,
					onFeedbackDelivery: expect.any(Function),
					onSessionCreated: expect.any(Function),
				}),
			);

			// Verify the callbacks were captured
			expect(mockOnFeedbackDelivery).toBeDefined();
			expect(mockOnSessionCreated).toBeDefined();
		});

		it("should include SYLAS_API_KEY as Authorization header for sylas-tools MCP config", () => {
			const previousApiKey = process.env.SYLAS_API_KEY;
			process.env.SYLAS_API_KEY = "test-sylas-api-key";

			try {
				const mcpConfig = (edgeWorker as any).buildMcpConfig(
					mockRepository,
					"parent-session-123",
				);
				const sylasToolsConfig = mcpConfig["sylas-tools"] as {
					headers?: Record<string, string>;
				};

				expect(sylasToolsConfig.headers?.Authorization).toBe(
					"Bearer test-sylas-api-key",
				);
			} finally {
				if (previousApiKey === undefined) {
					delete process.env.SYLAS_API_KEY;
				} else {
					process.env.SYLAS_API_KEY = previousApiKey;
				}
			}
		});

		it("should validate sylas-tools MCP Authorization header against SYLAS_API_KEY", () => {
			const previousApiKey = process.env.SYLAS_API_KEY;
			process.env.SYLAS_API_KEY = "test-sylas-api-key";

			try {
				expect(
					(edgeWorker as any).isSylasToolsMcpAuthorizationValid(
						"Bearer test-sylas-api-key",
					),
				).toBe(true);
				expect(
					(edgeWorker as any).isSylasToolsMcpAuthorizationValid(
						"Bearer wrong-key",
					),
				).toBe(false);
				expect(
					(edgeWorker as any).isSylasToolsMcpAuthorizationValid(undefined),
				).toBe(false);
			} finally {
				if (previousApiKey === undefined) {
					delete process.env.SYLAS_API_KEY;
				} else {
					process.env.SYLAS_API_KEY = previousApiKey;
				}
			}
		});
	});
});
