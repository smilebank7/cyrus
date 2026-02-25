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

describe("EdgeWorker - Version Endpoint", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;

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

	describe("registerVersionEndpoint", () => {
		it("should register GET /version endpoint with Fastify", async () => {
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

			// Call registerVersionEndpoint
			(edgeWorker as any).registerVersionEndpoint();

			// Verify GET /version was registered
			expect(mockGet).toHaveBeenCalledWith("/version", expect.any(Function));
		});

		it("should return null version when version is not provided", async () => {
			let capturedHandler: any = null;
			const mockGet = mock((path: string, handler: any) => {
				if (path === "/version") {
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

			// Config without version
			edgeWorker = new EdgeWorker(mockConfig);
			(edgeWorker as any).registerVersionEndpoint();

			// Mock reply object
			const mockReply = {
				status: mock().mockReturnThis(),
				send: mock().mockReturnThis(),
			};

			// Call the captured handler
			expect(capturedHandler).not.toBeNull();
			await capturedHandler({}, mockReply);

			expect(mockReply.status).toHaveBeenCalledWith(200);
			expect(mockReply.send).toHaveBeenCalledWith({
				sylas_cli_version: null,
			});
		});

		it("should return version when version is provided", async () => {
			let capturedHandler: any = null;
			const mockGet = mock((path: string, handler: any) => {
				if (path === "/version") {
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

			// Config with version
			const configWithVersion: EdgeWorkerConfig = {
				...mockConfig,
				version: "1.2.3",
			};
			edgeWorker = new EdgeWorker(configWithVersion);
			(edgeWorker as any).registerVersionEndpoint();

			// Mock reply object
			const mockReply = {
				status: mock().mockReturnThis(),
				send: mock().mockReturnThis(),
			};

			// Call the captured handler
			expect(capturedHandler).not.toBeNull();
			await capturedHandler({}, mockReply);

			expect(mockReply.status).toHaveBeenCalledWith(200);
			expect(mockReply.send).toHaveBeenCalledWith({
				sylas_cli_version: "1.2.3",
			});
		});

		it("should return empty string for empty string version", async () => {
			let capturedHandler: any = null;
			const mockGet = mock((path: string, handler: any) => {
				if (path === "/version") {
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

			// Config with empty string version - should still return empty string (not null)
			// as the nullish coalescing operator only converts undefined/null to null
			const configWithEmptyVersion: EdgeWorkerConfig = {
				...mockConfig,
				version: "",
			};
			edgeWorker = new EdgeWorker(configWithEmptyVersion);
			(edgeWorker as any).registerVersionEndpoint();

			// Mock reply object
			const mockReply = {
				status: mock().mockReturnThis(),
				send: mock().mockReturnThis(),
			};

			// Call the captured handler
			expect(capturedHandler).not.toBeNull();
			await capturedHandler({}, mockReply);

			expect(mockReply.status).toHaveBeenCalledWith(200);
			// Empty string is truthy for ?? operator, so it returns empty string
			expect(mockReply.send).toHaveBeenCalledWith({
				sylas_cli_version: "",
			});
		});
	});
});
