import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import { EdgeWorker } from "../src/EdgeWorker.js";
import type { EdgeWorkerConfig, RepositoryConfig } from "../src/types.js";

// Mock fs/promises
mock.module("fs/promises", () => ({
	...require("node:fs/promises"),
	readFile: mock(),
	writeFile: mock(),
	mkdir: mock(),
	rename: mock(),
	readdir: mock().mockResolvedValue([]),
}));

// Mock dependencies
mock.module("sylas-claude-runner", () => ({}));
mock.module("sylas-codex-runner", () => ({}));
mock.module("sylas-gemini-runner", () => ({}));
mock.module("sylas-linear-event-transport", () => ({}));
mock.module("@linear/sdk", () => ({}));
mock.module("../src/SharedApplicationServer.js", () => ({
	SharedApplicationServer: mock().mockImplementation(() => ({
		initializeFastify: mock(),
		getFastifyInstance: mock().mockReturnValue({
			get: mock(),
			post: mock(),
		}),
		start: mock().mockResolvedValue(undefined),
		stop: mock().mockResolvedValue(undefined),
		getWebhookUrl: mock().mockReturnValue("http://localhost:3456/webhook"),
	})),
}));
mock.module("../src/AgentSessionManager.js", () => ({
	AgentSessionManager: mock().mockImplementation(() => ({
		getAllAgentRunners: mock().mockReturnValue([]),
		getAllSessions: mock().mockReturnValue([]),
		createLinearAgentSession: mock(),
		getSession: mock(),
		getActiveSessionsByIssueId: mock().mockReturnValue([]),
		on: mock(), // EventEmitter method
		emit: mock(), // EventEmitter method
	})),
}));
mock.module("sylas-core", () => {
	const actual = require("sylas-core") as any;
	return {
		...actual,
		isAgentSessionCreatedWebhook: mock().mockReturnValue(false),
		isAgentSessionPromptedWebhook: mock().mockReturnValue(false),
		isIssueAssignedWebhook: mock().mockReturnValue(false),
		isIssueCommentMentionWebhook: mock().mockReturnValue(false),
		isIssueNewCommentWebhook: mock().mockReturnValue(false),
		isIssueUnassignedWebhook: mock().mockReturnValue(false),
		PersistenceManager: mock().mockImplementation(() => ({
			loadEdgeWorkerState: mock().mockResolvedValue(null),
			saveEdgeWorkerState: mock().mockResolvedValue(undefined),
		})),
	};
});
mock.module("file-type", () => ({}));
mock.module("chokidar", () => ({
	watch: mock().mockReturnValue({
		on: mock().mockReturnThis(),
		close: mock().mockResolvedValue(undefined),
	}),
}));

describe("EdgeWorker - Status Endpoint", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let _registeredGetHandler:
		| ((request: any, reply: any) => Promise<any>)
		| null = null;

	const mockRepository: RepositoryConfig = {
		id: "test-repo",
		name: "Test Repo",
		repositoryPath: "/test/repo",
		workspaceBaseDir: "/test/workspaces",
		baseBranch: "main",
		linearToken: "test-token",
		linearWorkspaceId: "test-workspace",
		isActive: true,
	};

	beforeEach(() => {
		mock.restore();
		_registeredGetHandler = null;

		// Mock console methods
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
		spyOn(console, "warn").mockImplementation(() => {});

		mockConfig = {
			platform: "linear",
			sylasHome: "/test/.sylas",
			repositories: [mockRepository],
		};
	});

	afterEach(async () => {
		if (edgeWorker) {
			try {
				await edgeWorker.stop();
			} catch {
				// Ignore cleanup errors
			}
		}
	});

	describe("computeStatus", () => {
		it("should return idle when no webhooks are being processed and no runners are active", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			// Access the private method via type assertion for testing
			const status = (edgeWorker as any).computeStatus();

			expect(status).toBe("idle");
		});

		it("should return busy when activeWebhookCount > 0", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			// Simulate webhook processing
			(edgeWorker as any).activeWebhookCount = 1;

			const status = (edgeWorker as any).computeStatus();

			expect(status).toBe("busy");
		});

		it("should return busy when a runner is running", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			// Create a mock runner that is running
			const mockRunner = {
				isRunning: mock().mockReturnValue(true),
			};

			// Create a mock session manager that returns the mock runner
			const mockSessionManager = {
				getAllAgentRunners: mock().mockReturnValue([mockRunner]),
			};

			// Set the mock session manager
			(edgeWorker as any).agentSessionManagers.set(
				"test-repo",
				mockSessionManager,
			);

			const status = (edgeWorker as any).computeStatus();

			expect(status).toBe("busy");
			expect(mockRunner.isRunning).toHaveBeenCalled();
		});

		it("should return idle when runner exists but is not running", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			// Create a mock runner that is not running
			const mockRunner = {
				isRunning: mock().mockReturnValue(false),
			};

			// Create a mock session manager that returns the mock runner
			const mockSessionManager = {
				getAllAgentRunners: mock().mockReturnValue([mockRunner]),
			};

			// Set the mock session manager
			(edgeWorker as any).agentSessionManagers.set(
				"test-repo",
				mockSessionManager,
			);

			const status = (edgeWorker as any).computeStatus();

			expect(status).toBe("idle");
		});

		it("should return busy when multiple runners exist and at least one is running", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			// Create mock runners - one running, one not
			const mockRunner1 = {
				isRunning: mock().mockReturnValue(false),
			};
			const mockRunner2 = {
				isRunning: mock().mockReturnValue(true),
			};

			// Create a mock session manager that returns both runners
			const mockSessionManager = {
				getAllAgentRunners: mock().mockReturnValue([mockRunner1, mockRunner2]),
			};

			// Set the mock session manager
			(edgeWorker as any).agentSessionManagers.set(
				"test-repo",
				mockSessionManager,
			);

			const status = (edgeWorker as any).computeStatus();

			expect(status).toBe("busy");
		});

		it("should check all session managers across multiple repositories", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			// Create mock runners for different repos - repo1 idle, repo2 busy
			const mockRunner1 = {
				isRunning: mock().mockReturnValue(false),
			};
			const mockRunner2 = {
				isRunning: mock().mockReturnValue(true),
			};

			const mockSessionManager1 = {
				getAllAgentRunners: mock().mockReturnValue([mockRunner1]),
			};
			const mockSessionManager2 = {
				getAllAgentRunners: mock().mockReturnValue([mockRunner2]),
			};

			// Set multiple session managers
			(edgeWorker as any).agentSessionManagers.set(
				"repo-1",
				mockSessionManager1,
			);
			(edgeWorker as any).agentSessionManagers.set(
				"repo-2",
				mockSessionManager2,
			);

			const status = (edgeWorker as any).computeStatus();

			expect(status).toBe("busy");
			expect(mockSessionManager1.getAllAgentRunners).toHaveBeenCalled();
			expect(mockSessionManager2.getAllAgentRunners).toHaveBeenCalled();
		});
	});

	describe("activeWebhookCount tracking", () => {
		it("should increment and decrement activeWebhookCount during webhook handling", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			// Verify initial state
			expect((edgeWorker as any).activeWebhookCount).toBe(0);

			// Call handleWebhook with a mock webhook that doesn't match any handler
			const mockWebhook = { action: "unknown" };
			await (edgeWorker as any).handleWebhook(mockWebhook, [mockRepository]);

			// After completion, count should be back to 0
			expect((edgeWorker as any).activeWebhookCount).toBe(0);
		});

		it("should decrement activeWebhookCount even when handler throws an error", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			// Mock isIssueUnassignedWebhook to return true and make the handler throw
			const { isIssueUnassignedWebhook } = await import("sylas-core");
			(isIssueUnassignedWebhook as any).mockReturnValue(true);

			// Mock the handler to throw
			(edgeWorker as any).handleIssueUnassignedWebhook =
				mock().mockRejectedValue(new Error("Test error"));

			// Call handleWebhook
			const mockWebhook = { action: "issueUnassigned", notification: {} };
			await (edgeWorker as any).handleWebhook(mockWebhook, [mockRepository]);

			// Count should still be 0 after error (finally block executed)
			expect((edgeWorker as any).activeWebhookCount).toBe(0);
		});
	});

	describe("registerStatusEndpoint", () => {
		it("should register GET /status endpoint with Fastify", async () => {
			const mockGet = mock();
			const mockFastify = {
				get: mockGet,
				post: mock(),
			};

			// Create EdgeWorker with mock that captures the registered handler
			const { SharedApplicationServer } = await import(
				"../src/SharedApplicationServer.js"
			);
			(SharedApplicationServer as any).mockImplementation(
				() =>
					({
						initializeFastify: mock(),
						getFastifyInstance: mock().mockReturnValue(mockFastify),
						start: mock().mockResolvedValue(undefined),
						stop: mock().mockResolvedValue(undefined),
						getWebhookUrl: mock().mockReturnValue(
							"http://localhost:3456/webhook",
						),
					}) as any,
			);

			edgeWorker = new EdgeWorker(mockConfig);

			// Call registerStatusEndpoint
			(edgeWorker as any).registerStatusEndpoint();

			// Verify GET /status was registered
			expect(mockGet).toHaveBeenCalledWith("/status", expect.any(Function));
		});

		it("should return idle status via the endpoint handler", async () => {
			let capturedHandler: any = null;
			const mockGet = mock((path: string, handler: any) => {
				if (path === "/status") {
					capturedHandler = handler;
				}
			});
			const mockFastify = {
				get: mockGet,
				post: mock(),
			};

			const { SharedApplicationServer } = await import(
				"../src/SharedApplicationServer.js"
			);
			(SharedApplicationServer as any).mockImplementation(
				() =>
					({
						initializeFastify: mock(),
						getFastifyInstance: mock().mockReturnValue(mockFastify),
						start: mock().mockResolvedValue(undefined),
						stop: mock().mockResolvedValue(undefined),
						getWebhookUrl: mock().mockReturnValue(
							"http://localhost:3456/webhook",
						),
					}) as any,
			);

			edgeWorker = new EdgeWorker(mockConfig);
			(edgeWorker as any).registerStatusEndpoint();

			// Mock reply object
			const mockReply = {
				status: mock().mockReturnThis(),
				send: mock().mockReturnThis(),
			};

			// Call the captured handler
			expect(capturedHandler).not.toBeNull();
			await capturedHandler({}, mockReply);

			expect(mockReply.status).toHaveBeenCalledWith(200);
			expect(mockReply.send).toHaveBeenCalledWith({ status: "idle" });
		});

		it("should return busy status via the endpoint handler when webhook is processing", async () => {
			let capturedHandler: any = null;
			const mockGet = mock((path: string, handler: any) => {
				if (path === "/status") {
					capturedHandler = handler;
				}
			});
			const mockFastify = {
				get: mockGet,
				post: mock(),
			};

			const { SharedApplicationServer } = await import(
				"../src/SharedApplicationServer.js"
			);
			(SharedApplicationServer as any).mockImplementation(
				() =>
					({
						initializeFastify: mock(),
						getFastifyInstance: mock().mockReturnValue(mockFastify),
						start: mock().mockResolvedValue(undefined),
						stop: mock().mockResolvedValue(undefined),
						getWebhookUrl: mock().mockReturnValue(
							"http://localhost:3456/webhook",
						),
					}) as any,
			);

			edgeWorker = new EdgeWorker(mockConfig);
			(edgeWorker as any).registerStatusEndpoint();

			// Simulate active webhook
			(edgeWorker as any).activeWebhookCount = 1;

			// Mock reply object
			const mockReply = {
				status: mock().mockReturnThis(),
				send: mock().mockReturnThis(),
			};

			// Call the captured handler
			expect(capturedHandler).not.toBeNull();
			await capturedHandler({}, mockReply);

			expect(mockReply.status).toHaveBeenCalledWith(200);
			expect(mockReply.send).toHaveBeenCalledWith({ status: "busy" });
		});
	});
});
