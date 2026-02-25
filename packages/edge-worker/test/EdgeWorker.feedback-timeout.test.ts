import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
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

describe("EdgeWorker - Feedback Delivery Timeout Issue", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let mockAgentSessionManager: any;
	let mockChildAgentSessionManager: any;
	let mockClaudeRunner: any;
	let resumeClaudeSessionSpy: any;
	let mockOnFeedbackDelivery: any;
	let _mockOnSessionCreated: any;

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
		_mockOnSessionCreated = mock();

		// Mock createSylasToolsServer to return a proper structure
		(createSylasToolsServer as any).mockImplementation((_token, options) => {
			// Capture the callbacks
			if (options?.onFeedbackDelivery) {
				mockOnFeedbackDelivery = options.onFeedbackDelivery;
			}
			if (options?.onSessionCreated) {
				_mockOnSessionCreated = options.onSessionCreated;
			}

			// Return a mock MCP server shape
			return {
				server: {},
			} as any;
		});

		// Mock ClaudeRunner with a long-running session to simulate the timeout
		mockClaudeRunner = {
			supportsStreamingInput: true,
			startStreaming: mock().mockImplementation(async () => {
				// Simulate a long-running Claude session (10 seconds)
				await new Promise((resolve) => setTimeout(resolve, 10000));
				return { sessionId: "claude-session-123" };
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
			reasoning: "mocked for timeout tests",
		});

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
		jest.useRealTimers();
	});

	describe("Feedback Delivery Timeout Fix", () => {
		it("FIXED: should return immediately without waiting for child session to complete", async () => {
			// This test verifies the fix: feedback delivery returns immediately
			// without waiting for the child session to complete

			// Arrange
			const childSessionId = "child-session-456";
			const feedbackMessage =
				"Please revise your approach and focus on the error handling";

			// Use the real implementation without mocking resumeAgentSession
			// to test the actual fire-and-forget behavior
			resumeClaudeSessionSpy = spyOn(
				edgeWorker as any,
				"resumeAgentSession",
			).mockImplementation(async () => {
				// Simulate a long-running session
				await mockClaudeRunner.startStreaming();
				return undefined;
			});

			// Build MCP config which will trigger createSylasToolsServer
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				"parent-session-123",
			);

			// Act - Call the feedback delivery and measure time
			const startTime = Date.now();
			const result = await mockOnFeedbackDelivery(
				childSessionId,
				feedbackMessage,
			);
			const endTime = Date.now();
			const duration = endTime - startTime;

			// Assert - The feedback delivery should return quickly
			expect(result).toBe(true);

			// Wait for the async handlePromptWithStreamingCheck to complete (fire-and-forget pattern)
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(resumeClaudeSessionSpy).toHaveBeenCalledOnce();

			// Should return in less than 100ms (not wait for the 10-second session)
			expect(duration).toBeLessThan(100);

			// The child session is still running in the background
			expect(mockClaudeRunner.startStreaming).toHaveBeenCalledOnce();
		}); // Regular timeout since it should return quickly

		it("should verify feedback initiates session but doesn't block on completion", async () => {
			// This test verifies the fire-and-forget behavior

			// Arrange
			const childSessionId = "child-session-456";
			const feedbackMessage = "Test feedback";
			let sessionCompleted = false;

			// Mock resumeAgentSession to track when it completes
			resumeClaudeSessionSpy = spyOn(
				edgeWorker as any,
				"resumeAgentSession",
			).mockImplementation(async () => {
				// Start a 2-second operation
				await new Promise((resolve) => setTimeout(resolve, 2000));
				sessionCompleted = true;
				return undefined;
			});

			// Build MCP config
			const _mcpConfig = (edgeWorker as any).buildMcpConfig(
				mockRepository,
				"parent-session-123",
			);

			// Act
			const startTime = Date.now();
			const result = await mockOnFeedbackDelivery(
				childSessionId,
				feedbackMessage,
			);
			const duration = Date.now() - startTime;

			// Assert
			expect(result).toBe(true);
			expect(duration).toBeLessThan(100); // Returns immediately
			expect(sessionCompleted).toBe(false); // Session still running

			// Wait for the async handlePromptWithStreamingCheck to complete (fire-and-forget pattern)
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(resumeClaudeSessionSpy).toHaveBeenCalledOnce();

			// Wait a bit and verify session completes in background
			await new Promise((resolve) => setTimeout(resolve, 2100));
			expect(sessionCompleted).toBe(true);
		}, 5000);
	});
});
