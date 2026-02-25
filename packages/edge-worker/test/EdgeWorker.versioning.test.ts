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
import { EdgeWorker } from "../src/EdgeWorker.js";
import type { EdgeWorkerConfig } from "../src/types.js";

// Mock fs/promises
mock.module("fs/promises", () => ({
	...require("node:fs/promises"),
	readFile: mock(),
	writeFile: mock(),
	mkdir: mock(),
	rename: mock(),
}));

// Mock other dependencies
mock.module("sylas-claude-runner", () => ({}));
mock.module("sylas-codex-runner", () => ({}));
mock.module("@linear/sdk", () => {
	const actual = require("@linear/sdk");
	return {
		...actual,
		LinearClient: mock().mockImplementation(() => ({
			issue: mock(),
			viewer: Promise.resolve({
				organization: Promise.resolve({ id: "ws-123", name: "Test" }),
			}),
			client: {
				request: mock(),
				setHeader: mock(),
			},
		})),
	};
});
mock.module("../src/SharedApplicationServer.js", () => ({}));
mock.module("../src/AgentSessionManager.js", () => ({}));
mock.module("sylas-core", () => {
	const actual = require("sylas-core");
	return {
		...actual,
		PersistenceManager: mock().mockImplementation(() => ({
			loadEdgeWorkerState: mock().mockResolvedValue(null),
			saveEdgeWorkerState: mock().mockResolvedValue(undefined),
		})),
	};
});
mock.module("file-type", () => ({}));

describe("EdgeWorker - Version Tag Extraction", () => {
	let edgeWorker: EdgeWorker;
	let mockConfig: EdgeWorkerConfig;

	beforeEach(() => {
		// Clear all mocks
		mock.restore();

		// Mock console methods
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
		spyOn(console, "warn").mockImplementation(() => {});

		mockConfig = {
			proxyUrl: "http://localhost:3000",
			webhookPort: 3456,
			sylasHome: "/tmp/test-sylas-home",
			repositories: [
				{
					id: "test-repo",
					name: "Test Repo",
					repositoryPath: "/test/repo",
					workspaceBaseDir: "/test/workspaces",
					baseBranch: "main",
					linearToken: "test-token",
					linearWorkspaceId: "test-workspace",
					isActive: true,
					allowedTools: ["Read", "Edit"],
					promptTemplatePath: "/test/template.md",
				},
			],
		};

		edgeWorker = new EdgeWorker(mockConfig);
	});

	afterEach(() => {
		// Only clear mocks, don't restore them (restoreAllMocks would undo module mocks)
		mock.restore();
	});

	it("should extract version from prompt template", async () => {
		const templateWithVersion = `<version-tag value="builder-v1.0.0" />

# Issue Summary

Repository: {{repository_name}}
Issue: {{issue_identifier}} - {{issue_title}}

## Description
{{issue_description}}`;

		(readFile as any).mockResolvedValue(templateWithVersion);

		// Use reflection to test private method
		const extractVersionTag = (
			edgeWorker as any
		).promptBuilder.extractVersionTag.bind(edgeWorker);
		const version = extractVersionTag(templateWithVersion);

		expect(version).toBe("builder-v1.0.0");
	});

	it("should handle templates without version tags", async () => {
		const templateWithoutVersion = `# Issue Summary

Repository: {{repository_name}}
Issue: {{issue_identifier}} - {{issue_title}}

## Description
{{issue_description}}`;

		(readFile as any).mockResolvedValue(templateWithoutVersion);

		// Use reflection to test private method
		const extractVersionTag = (
			edgeWorker as any
		).promptBuilder.extractVersionTag.bind(edgeWorker);
		const version = extractVersionTag(templateWithoutVersion);

		expect(version).toBeUndefined();
	});

	it("should log version when present in prompt template", async () => {
		const templateWithVersion = `<version-tag value="debugger-v2.1.0" />

# Debug Issue

Repository: {{repository_name}}`;

		(readFile as any).mockResolvedValue(templateWithVersion);

		// Set log level to DEBUG so version logging (a debug message) is visible
		const originalLogLevel = process.env.SYLAS_LOG_LEVEL;
		process.env.SYLAS_LOG_LEVEL = "DEBUG";
		// Recreate EdgeWorker with DEBUG log level
		edgeWorker = new EdgeWorker(mockConfig);
		process.env.SYLAS_LOG_LEVEL = originalLogLevel;

		// Spy on console.log to check for version logging
		const logSpy = spyOn(console, "log");

		// Use reflection to test the buildIssueContextPrompt method
		const buildIssueContextPrompt = (
			edgeWorker as any
		).buildIssueContextPrompt.bind(edgeWorker);

		const mockIssue = {
			id: "issue-123",
			identifier: "TEST-123",
			title: "Test Issue",
			description: "Test description",
			state: { name: "Todo" },
			priority: 1,
			url: "http://test.com",
			branchName: "test-branch",
		};

		await buildIssueContextPrompt(mockIssue, mockConfig.repositories[0]);

		// Check that version was logged (at DEBUG level)
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining("Prompt template version: debugger-v2.1.0"),
		);
	});

	it("should not log version when template has no version tag", async () => {
		const templateWithoutVersion = `# Issue Summary

Repository: {{repository_name}}`;

		(readFile as any).mockResolvedValue(templateWithoutVersion);

		const logSpy = spyOn(console, "log");

		// Use reflection to test the buildIssueContextPrompt method
		const buildIssueContextPrompt = (
			edgeWorker as any
		).buildIssueContextPrompt.bind(edgeWorker);

		const mockIssue = {
			id: "issue-123",
			identifier: "TEST-123",
			title: "Test Issue",
			description: "Test description",
			state: { name: "Todo" },
			priority: 1,
			url: "http://test.com",
			branchName: "test-branch",
		};

		await buildIssueContextPrompt(mockIssue, mockConfig.repositories[0]);

		// Check that version was NOT logged
		const versionLogs = logSpy.mock.calls.filter((call) =>
			call[0]?.includes("Prompt template version:"),
		);
		expect(versionLogs).toHaveLength(0);
	});
});
