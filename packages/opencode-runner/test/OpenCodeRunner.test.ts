import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenCodeMessageFormatter } from "../src/formatter.js";
import { OpenCodeRunner } from "../src/OpenCodeRunner.js";
import type { OpenCodeRunnerConfig } from "../src/types.js";

// Mock child_process
vi.mock("node:child_process", () => ({
	spawn: vi.fn(),
}));

// Mock fs
vi.mock("node:fs", () => ({
	createWriteStream: vi.fn(() => ({
		write: vi.fn(),
		end: vi.fn(),
	})),
	mkdirSync: vi.fn(),
}));

function createConfig(
	overrides?: Partial<OpenCodeRunnerConfig>,
): OpenCodeRunnerConfig {
	return {
		cyrusHome: "/tmp/test-cyrus",
		workingDirectory: "/tmp/test-workspace",
		...overrides,
	};
}

describe("OpenCodeRunner", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should implement IAgentRunner interface", () => {
		const runner = new OpenCodeRunner(createConfig());
		expect(runner.supportsStreamingInput).toBe(false);
		expect(typeof runner.start).toBe("function");
		expect(typeof runner.stop).toBe("function");
		expect(typeof runner.isRunning).toBe("function");
		expect(typeof runner.getMessages).toBe("function");
		expect(typeof runner.getFormatter).toBe("function");
	});

	it("should return false for isRunning() before start", () => {
		const runner = new OpenCodeRunner(createConfig());
		expect(runner.isRunning()).toBe(false);
	});

	it("should return empty messages before start", () => {
		const runner = new OpenCodeRunner(createConfig());
		expect(runner.getMessages()).toEqual([]);
	});

	it("should return OpenCodeMessageFormatter", () => {
		const runner = new OpenCodeRunner(createConfig());
		const formatter = runner.getFormatter();
		expect(formatter).toBeInstanceOf(OpenCodeMessageFormatter);
	});

	it("should register event callbacks from config", () => {
		const onMessage = vi.fn();
		const onError = vi.fn();
		const onComplete = vi.fn();
		const runner = new OpenCodeRunner(
			createConfig({ onMessage, onError, onComplete }),
		);

		// Verify listeners are registered
		expect(runner.listenerCount("message")).toBe(1);
		expect(runner.listenerCount("error")).toBe(1);
		expect(runner.listenerCount("complete")).toBe(1);
	});

	it("should stop cleanly when not running", () => {
		const runner = new OpenCodeRunner(createConfig());
		// Should not throw
		runner.stop();
		expect(runner.isRunning()).toBe(false);
	});
});

describe("OpenCodeMessageFormatter", () => {
	const formatter = new OpenCodeMessageFormatter();

	describe("formatToolParameter", () => {
		it("should format bash command", () => {
			const result = formatter.formatToolParameter("bash", {
				command: "ls -la",
			});
			expect(result).toBe("ls -la");
		});

		it("should format read with file path", () => {
			const result = formatter.formatToolParameter("read", {
				file_path: "/src/index.ts",
			});
			expect(result).toBe("/src/index.ts");
		});

		it("should format read with offset and limit", () => {
			const result = formatter.formatToolParameter("read", {
				file_path: "/src/index.ts",
				offset: 10,
				limit: 20,
			});
			expect(result).toBe("/src/index.ts (lines 11-30)");
		});

		it("should format write with path", () => {
			const result = formatter.formatToolParameter("write", {
				path: "/src/new.ts",
			});
			expect(result).toBe("/src/new.ts");
		});

		it("should format grep with pattern", () => {
			const result = formatter.formatToolParameter("grep", {
				pattern: "TODO",
				path: "/src",
			});
			expect(result).toBe("Pattern: `TODO` in /src");
		});

		it("should format glob with pattern", () => {
			const result = formatter.formatToolParameter("glob", {
				pattern: "**/*.ts",
			});
			expect(result).toBe("Pattern: `**/*.ts`");
		});

		it("should handle MCP tool names", () => {
			const result = formatter.formatToolParameter("mcp__linear__get_issue", {
				issueId: "PROJ-123",
			});
			expect(result).toBe("issueId: PROJ-123");
		});

		it("should fallback to JSON for unknown tools", () => {
			const result = formatter.formatToolParameter("unknown_tool", {
				foo: "bar",
			});
			expect(result).toBe('{"foo":"bar"}');
		});
	});

	describe("formatToolActionName", () => {
		it("should format bash with description", () => {
			const result = formatter.formatToolActionName(
				"bash",
				{ command: "npm test", description: "Run tests" },
				false,
			);
			expect(result).toBe("bash (Run tests)");
		});

		it("should add Error suffix", () => {
			const result = formatter.formatToolActionName("read", {}, true);
			expect(result).toBe("read (Error)");
		});
	});

	describe("formatToolResult", () => {
		it("should format error results", () => {
			const result = formatter.formatToolResult(
				"bash",
				{},
				"file not found",
				true,
			);
			expect(result).toBe("```\nfile not found\n```");
		});

		it("should format bash results with command", () => {
			const result = formatter.formatToolResult(
				"bash",
				{ command: "echo hello" },
				"hello",
				false,
			);
			expect(result).toContain("```bash\necho hello\n```");
			expect(result).toContain("```\nhello\n```");
		});

		it("should format read results with language detection", () => {
			const result = formatter.formatToolResult(
				"read",
				{ file_path: "test.ts" },
				"const x = 1;",
				false,
			);
			expect(result).toBe("```typescript\nconst x = 1;\n```");
		});

		it("should return *Completed* for empty unknown tool results", () => {
			const result = formatter.formatToolResult("unknown", {}, "", false);
			expect(result).toBe("*Completed*");
		});
	});

	describe("formatTodoWriteParameter", () => {
		it("should format todos with status emojis", () => {
			const input = JSON.stringify({
				todos: [
					{ content: "Task 1", status: "completed" },
					{ content: "Task 2", status: "in_progress" },
					{ content: "Task 3", status: "pending" },
				],
			});
			const result = formatter.formatTodoWriteParameter(input);
			expect(result).toContain("✅ Task 1");
			expect(result).toContain("🔄 Task 2");
			expect(result).toContain("⏳ Task 3");
		});

		it("should return raw content for invalid JSON", () => {
			const result = formatter.formatTodoWriteParameter("not json");
			expect(result).toBe("not json");
		});
	});
});
