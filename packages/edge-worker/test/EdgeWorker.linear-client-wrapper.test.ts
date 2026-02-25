import { beforeEach, describe, expect, it, mock } from "bun:test";
import { LinearClient } from "@linear/sdk";
import type { EdgeWorkerConfig } from "sylas-core";
import { EdgeWorker } from "../src/EdgeWorker.js";

// Mock modules
mock.module("@linear/sdk", () => ({
	...require("@linear/sdk"),
	LinearClient: mock(),
}));
mock.module("../src/SharedApplicationServer.js", () => ({
	SharedApplicationServer: mock().mockImplementation(() => ({
		start: mock(),
		registerLinearEventTransport: mock(),
		registerConfigUpdater: mock(),
		registerOAuthCallback: mock(),
	})),
}));

// Mock fs/promises for file operations
mock.module("node:fs/promises", () => ({
	...require("node:fs/promises"),
	readFile: mock().mockResolvedValue(
		JSON.stringify({
			repositories: [
				{
					id: "repo-1",
					linearWorkspaceId: "workspace-123",
					linearToken: "old_token",
					linearRefreshToken: "old_refresh_token",
				},
				{
					id: "repo-2",
					linearWorkspaceId: "workspace-123",
					linearToken: "old_token",
					linearRefreshToken: "old_refresh_token",
				},
			],
		}),
	),
	writeFile: mock().mockResolvedValue(undefined),
	mkdir: mock().mockResolvedValue(undefined),
	readdir: mock().mockResolvedValue([]),
	rename: mock().mockResolvedValue(undefined),
}));

// Mock global fetch
global.fetch = mock();

describe("EdgeWorker LinearClient Wrapper", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;
	let mockLinearClient: any;

	beforeEach(() => {
		mock.restore();

		// Setup mock config
		mockConfig = {
			repositories: [
				{
					id: "repo-1",
					name: "test-repo-1",
					repositoryPath: "/test/repo1",
					workspaceBaseDir: "/test/workspaces",
					baseBranch: "main",
					linearWorkspaceId: "workspace-123",
					linearWorkspaceName: "Test Workspace",
					linearToken: "test_token",
					linearRefreshToken: "refresh_token",
				},
			],
			sylasHome: "/test/.sylas",
			serverPort: 3456,
			serverHost: "localhost",
		};

		// Mock environment variables
		process.env.LINEAR_CLIENT_ID = "test_client_id";
		process.env.LINEAR_CLIENT_SECRET = "test_client_secret";

		// Create mock LinearClient with methods and underlying GraphQL client
		mockLinearClient = {
			issue: mock(),
			viewer: Promise.resolve({
				organization: Promise.resolve({
					id: "workspace-123",
					name: "Test Workspace",
				}),
			}),
			createAgentActivity: mock(),
			// Mock the underlying GraphQL client for token refresh patching
			client: {
				request: mock(),
				setHeader: mock(),
			},
		};

		// Mock LinearClient constructor
		(LinearClient as any).mockImplementation(() => mockLinearClient);
	});

	describe("Auto-retry on 401 errors", () => {
		it("should pass through successful API calls", async () => {
			mockLinearClient.issue.mockResolvedValueOnce({
				id: "issue-123",
				title: "Test Issue",
			});

			edgeWorker = new EdgeWorker(mockConfig);
			const issueTrackers = (edgeWorker as any).issueTrackers;
			const issueTracker = issueTrackers.get("repo-1");

			const result = await issueTracker?.fetchIssue("issue-123");

			expect(result).toBeDefined();
			expect(mockLinearClient.issue).toHaveBeenCalledTimes(1);
		});

		it("should pass through non-401 errors without retry", async () => {
			const error = new Error("Network error");
			(error as any).status = 500;
			mockLinearClient.issue.mockRejectedValueOnce(error);

			edgeWorker = new EdgeWorker(mockConfig);
			const issueTrackers = (edgeWorker as any).issueTrackers;
			const issueTracker = issueTrackers.get("repo-1");

			await expect(issueTracker?.fetchIssue("issue-123")).rejects.toThrow(
				"Network error",
			);

			// Should only be called once (no retry for non-401)
			expect(mockLinearClient.issue).toHaveBeenCalledTimes(1);
		});

		it("should not configure token refresh without refresh token", async () => {
			// Setup config without refresh token
			mockConfig.repositories[0].linearRefreshToken = undefined;
			edgeWorker = new EdgeWorker(mockConfig);

			// The issueTracker should be created but without OAuth config
			const issueTrackers = (edgeWorker as any).issueTrackers;
			const issueTracker = issueTrackers.get("repo-1");
			expect(issueTracker).toBeDefined();
			// OAuth config should not be set (no refresh capability)
			expect((issueTracker as any).oauthConfig).toBeUndefined();
		});

		it("should not configure token refresh without OAuth credentials", async () => {
			// Remove OAuth credentials
			delete process.env.LINEAR_CLIENT_ID;
			delete process.env.LINEAR_CLIENT_SECRET;

			edgeWorker = new EdgeWorker(mockConfig);

			// The issueTracker should be created but without OAuth config
			const issueTrackers = (edgeWorker as any).issueTrackers;
			const issueTracker = issueTrackers.get("repo-1");
			expect(issueTracker).toBeDefined();
			// OAuth config should not be set (no refresh capability)
			expect((issueTracker as any).oauthConfig).toBeUndefined();
		});
	});

	describe("OAuth config setup", () => {
		it("should configure OAuth with correct credentials", async () => {
			edgeWorker = new EdgeWorker(mockConfig);

			const issueTrackers = (edgeWorker as any).issueTrackers;
			const issueTracker = issueTrackers.get("repo-1");
			const oauthConfig = (issueTracker as any).oauthConfig;

			expect(oauthConfig).toBeDefined();
			expect(oauthConfig.clientId).toBe("test_client_id");
			expect(oauthConfig.clientSecret).toBe("test_client_secret");
			expect(oauthConfig.refreshToken).toBe("refresh_token");
			expect(oauthConfig.workspaceId).toBe("workspace-123");
			expect(oauthConfig.onTokenRefresh).toBeDefined();
		});
	});
});
