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
import type { GitHubWebhookEvent } from "sylas-github-event-transport";
import { issueCommentPayload } from "sylas-github-event-transport/test/fixtures";
import { LinearEventTransport } from "sylas-linear-event-transport";
import { AgentSessionManager } from "../src/AgentSessionManager.js";
import { EdgeWorker } from "../src/EdgeWorker.js";
import { SharedApplicationServer } from "../src/SharedApplicationServer.js";
import type { EdgeWorkerConfig, RepositoryConfig } from "../src/types.js";

// Mock dependencies
mock.module("sylas-claude-runner", () => ({
	...require("sylas-claude-runner"),
	ClaudeRunner: mock(),
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
		PersistenceManager: mock().mockImplementation(() => ({
			loadEdgeWorkerState: mock().mockResolvedValue(null),
			saveEdgeWorkerState: mock().mockResolvedValue(undefined),
		})),
	};
});
mock.module("file-type", () => ({}));

describe("EdgeWorker - fetchPRBranchRef", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let mockLinearClient: any;
	let mockClaudeRunner: any;
	let mockAgentSessionManager: any;
	let mockRepository: RepositoryConfig;

	beforeEach(() => {
		mock.restore();

		// Suppress console output
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});

		// Mock LinearClient
		mockLinearClient = {
			issue: mock().mockResolvedValue({
				id: "test-issue-id",
				identifier: "TEST-1",
				title: "Test Issue",
				description: "Test description",
			}),
		};
		(LinearClient as any).mockImplementation(() => mockLinearClient);

		// Mock ClaudeRunner
		mockClaudeRunner = {
			run: mock().mockResolvedValue({
				sessionId: "test-session-id",
				messageCount: 10,
			}),
			on: mock(),
			removeAllListeners: mock(),
		};
		(ClaudeRunner as any).mockImplementation(() => mockClaudeRunner);

		// Mock AgentSessionManager
		mockAgentSessionManager = {
			createSession: mock().mockResolvedValue(undefined),
			recordThought: mock().mockResolvedValue(undefined),
			recordAction: mock().mockResolvedValue(undefined),
			completeSession: mock().mockResolvedValue(undefined),
			handleClaudeMessage: mock().mockResolvedValue(undefined),
		};
		(AgentSessionManager as any).mockImplementation(
			() => mockAgentSessionManager,
		);

		// Mock LinearEventTransport
		const mockLinearEventTransport = {
			on: mock(),
			start: mock().mockResolvedValue(undefined),
			stop: mock().mockResolvedValue(undefined),
		};
		(LinearEventTransport as any).mockImplementation(
			() => mockLinearEventTransport,
		);

		// Mock SharedApplicationServer
		const mockSharedAppServer = {
			start: mock().mockResolvedValue(undefined),
			stop: mock().mockResolvedValue(undefined),
		};
		(SharedApplicationServer as any).mockImplementation(
			() => mockSharedAppServer,
		);

		// Create EdgeWorker config
		mockConfig = {
			sylasHome: "/tmp/test-sylas-home",
			repositories: [],
		};

		// Create mock repository config
		mockRepository = {
			owner: "testorg",
			name: "my-repo",
			cloneUrl: "https://github.com/testorg/my-repo.git",
			basePath: "/tmp/test-repos",
			linearToken: "test-linear-token",
			primaryBranch: "main",
		};

		edgeWorker = new EdgeWorker(mockConfig);
	});

	afterEach(() => {
		mock.restore();
	});

	describe("Authentication Token Handling", () => {
		it("should use event.installationToken when available instead of process.env.GITHUB_TOKEN", async () => {
			// Create event with installationToken
			const eventWithToken: GitHubWebhookEvent = {
				eventType: "issue_comment",
				deliveryId: "test-delivery-id",
				payload: issueCommentPayload,
				installationToken: "ghs_forwarded_installation_token_123",
			};

			// Mock GitHub API response
			const mockFetch = mock().mockResolvedValue({
				ok: true,
				json: async () => ({
					head: {
						ref: "fix-tests",
					},
				}),
			});
			global.fetch = mockFetch;

			// Call fetchPRBranchRef via reflection (it's private)
			const result = await (edgeWorker as any).fetchPRBranchRef(
				eventWithToken,
				mockRepository,
			);

			// Verify the result
			expect(result).toBe("fix-tests");

			// THIS IS THE FAILING ASSERTION - the current implementation uses process.env.GITHUB_TOKEN
			// but it SHOULD use event.installationToken
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.github.com/repos/testorg/my-repo/pulls/42",
				{
					headers: {
						Accept: "application/vnd.github+json",
						"X-GitHub-Api-Version": "2022-11-28",
						Authorization: "Bearer ghs_forwarded_installation_token_123",
					},
				},
			);
		});

		it("should fall back to process.env.GITHUB_TOKEN when installationToken is not available", async () => {
			// Set process.env.GITHUB_TOKEN
			process.env.GITHUB_TOKEN = "ghp_env_token_456";

			// Create event without installationToken
			const eventWithoutToken: GitHubWebhookEvent = {
				eventType: "issue_comment",
				deliveryId: "test-delivery-id",
				payload: issueCommentPayload,
			};

			// Mock GitHub API response
			const mockFetch = mock().mockResolvedValue({
				ok: true,
				json: async () => ({
					head: {
						ref: "fix-tests",
					},
				}),
			});
			global.fetch = mockFetch;

			// Call fetchPRBranchRef
			const result = await (edgeWorker as any).fetchPRBranchRef(
				eventWithoutToken,
				mockRepository,
			);

			// Verify the result
			expect(result).toBe("fix-tests");

			// Verify it used the environment variable
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.github.com/repos/testorg/my-repo/pulls/42",
				{
					headers: {
						Accept: "application/vnd.github+json",
						"X-GitHub-Api-Version": "2022-11-28",
						Authorization: "Bearer ghp_env_token_456",
					},
				},
			);

			// Cleanup
			delete process.env.GITHUB_TOKEN;
		});

		it("should make unauthenticated request when neither token is available", async () => {
			// Ensure no GITHUB_TOKEN in env
			delete process.env.GITHUB_TOKEN;

			// Create event without installationToken
			const eventWithoutToken: GitHubWebhookEvent = {
				eventType: "issue_comment",
				deliveryId: "test-delivery-id",
				payload: issueCommentPayload,
			};

			// Mock GitHub API response (this will fail with 404 for private repos)
			const mockFetch = mock().mockResolvedValue({
				ok: false,
				status: 404,
			});
			global.fetch = mockFetch;

			// Call fetchPRBranchRef
			const result = await (edgeWorker as any).fetchPRBranchRef(
				eventWithoutToken,
				mockRepository,
			);

			// Verify it returns null due to 404
			expect(result).toBe(null);

			// Verify it attempted an unauthenticated request (no Authorization header)
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.github.com/repos/testorg/my-repo/pulls/42",
				{
					headers: {
						Accept: "application/vnd.github+json",
						"X-GitHub-Api-Version": "2022-11-28",
						// No Authorization header
					},
				},
			);
		});
	});
});
