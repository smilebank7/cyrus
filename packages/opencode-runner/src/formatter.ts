/**
 * OpenCode Message Formatter
 *
 * Implements message formatting for OpenCode tool messages.
 * Converts tool use/result messages into human-readable content for Linear.
 *
 * OpenCode tool names follow a pattern similar to Claude's tools:
 * - read: Read file contents
 * - write: Write content to a file
 * - edit: Edit file contents
 * - bash: Execute shell commands
 * - glob: Find files matching patterns
 * - grep: Search file contents
 * - todowrite: Update task list
 *
 * @packageDocumentation
 */

import type { IMessageFormatter } from "cyrus-core";

type ToolInput = Record<string, unknown>;

function getString(input: ToolInput, key: string): string | undefined {
	const value = input[key];
	return typeof value === "string" ? value : undefined;
}

function getNumber(input: ToolInput, key: string): number | undefined {
	const value = input[key];
	return typeof value === "number" ? value : undefined;
}

export class OpenCodeMessageFormatter implements IMessageFormatter {
	formatTaskParameter(toolName: string, toolInput: ToolInput): string {
		if (typeof toolInput === "string") return toolInput;

		try {
			switch (toolName) {
				case "TaskCreate": {
					const subject = getString(toolInput, "subject") || "";
					const description = getString(toolInput, "description") || "";
					let formatted = subject;
					if (description && description !== subject) {
						formatted += `\n${description}`;
					}
					return formatted;
				}
				case "TaskUpdate": {
					const taskId = getString(toolInput, "taskId") || "";
					const status = getString(toolInput, "status");
					const subject = getString(toolInput, "subject");
					let emoji = "";
					if (status === "completed") emoji = "✅";
					else if (status === "in_progress") emoji = "🔄";
					else if (status === "pending") emoji = "⏳";
					else if (status === "deleted") emoji = "🗑️";
					if (subject) return `${emoji} Task #${taskId} — ${subject}`;
					return `${emoji} Task #${taskId}`;
				}
				case "TaskGet": {
					const taskId = getString(toolInput, "taskId");
					return taskId ? `Task #${taskId}` : JSON.stringify(toolInput);
				}
				case "TaskList":
					return "List all tasks";
				default:
					return JSON.stringify(toolInput);
			}
		} catch {
			return JSON.stringify(toolInput);
		}
	}

	formatTodoWriteParameter(jsonContent: string): string {
		try {
			const data = JSON.parse(jsonContent);
			if (!data.todos || !Array.isArray(data.todos)) {
				return jsonContent;
			}

			const todos = data.todos as Array<{
				content?: string;
				description?: string;
				status: string;
			}>;

			let formatted = "\n";
			todos.forEach((todo, index) => {
				let statusEmoji = "";
				if (todo.status === "completed") statusEmoji = "✅ ";
				else if (todo.status === "in_progress") statusEmoji = "🔄 ";
				else if (todo.status === "pending") statusEmoji = "⏳ ";

				const text = todo.content || todo.description || "";
				formatted += `${statusEmoji}${text}`;
				if (index < todos.length - 1) formatted += "\n";
			});

			return formatted;
		} catch {
			return jsonContent;
		}
	}

	formatToolParameter(toolName: string, toolInput: ToolInput): string {
		if (typeof toolInput === "string") return toolInput;

		try {
			switch (toolName) {
				case "bash": {
					const command = getString(toolInput, "command");
					return command || JSON.stringify(toolInput);
				}
				case "read": {
					const filePath =
						getString(toolInput, "file_path") || getString(toolInput, "path");
					if (filePath) {
						let param = filePath;
						const offset = getNumber(toolInput, "offset");
						const limit = getNumber(toolInput, "limit");
						if (offset !== undefined || limit !== undefined) {
							const start = offset || 0;
							const end = limit ? start + limit : "end";
							param += ` (lines ${start + 1}-${end})`;
						}
						return param;
					}
					break;
				}
				case "write": {
					const filePath =
						getString(toolInput, "file_path") || getString(toolInput, "path");
					if (filePath) return filePath;
					break;
				}
				case "edit": {
					const filePath =
						getString(toolInput, "file_path") || getString(toolInput, "path");
					if (filePath) return filePath;
					break;
				}
				case "glob": {
					const pattern = getString(toolInput, "pattern");
					if (pattern) return `Pattern: \`${pattern}\``;
					break;
				}
				case "grep": {
					const pattern = getString(toolInput, "pattern");
					if (pattern) {
						let param = `Pattern: \`${pattern}\``;
						const path = getString(toolInput, "path");
						if (path) param += ` in ${path}`;
						return param;
					}
					break;
				}
				case "todowrite":
					if (toolInput.todos && Array.isArray(toolInput.todos)) {
						return this.formatTodoWriteParameter(JSON.stringify(toolInput));
					}
					break;
				default:
					if (toolName.startsWith("mcp__")) {
						const fields = ["query", "id", "issueId", "title", "name", "path"];
						for (const field of fields) {
							const value = getString(toolInput, field);
							if (value) return `${field}: ${value}`;
						}
					}
					break;
			}
			return JSON.stringify(toolInput);
		} catch {
			return JSON.stringify(toolInput);
		}
	}

	formatToolActionName(
		toolName: string,
		toolInput: ToolInput,
		isError: boolean,
	): string {
		if (toolName === "bash") {
			const description = getString(toolInput, "description");
			if (description) {
				const baseName = isError ? `${toolName} (Error)` : toolName;
				return `${baseName} (${description})`;
			}
		}
		return isError ? `${toolName} (Error)` : toolName;
	}

	formatToolResult(
		toolName: string,
		toolInput: ToolInput,
		result: string,
		isError: boolean,
	): string {
		if (isError) return `\`\`\`\n${result}\n\`\`\``;

		try {
			switch (toolName) {
				case "bash": {
					let formatted = "";
					const command = getString(toolInput, "command");
					if (command) formatted += `\`\`\`bash\n${command}\n\`\`\`\n\n`;
					if (result?.trim()) {
						formatted += `\`\`\`\n${result}\n\`\`\``;
					} else {
						formatted += "*No output*";
					}
					return formatted;
				}
				case "read": {
					if (result?.trim()) {
						let lang = "";
						const filePath =
							getString(toolInput, "file_path") || getString(toolInput, "path");
						if (filePath) {
							const ext = filePath.split(".").pop()?.toLowerCase();
							const langMap: Record<string, string> = {
								ts: "typescript",
								tsx: "typescript",
								js: "javascript",
								jsx: "javascript",
								py: "python",
								go: "go",
								rs: "rust",
								json: "json",
								yaml: "yaml",
								yml: "yaml",
								md: "markdown",
								sh: "bash",
							};
							lang = langMap[ext || ""] || "";
						}
						return `\`\`\`${lang}\n${result}\n\`\`\``;
					}
					return "*File read successfully*";
				}
				case "write":
					return result?.trim() ? result : "*File written successfully*";
				case "edit":
					return result?.trim() ? result : "*Edit completed*";
				case "grep":
				case "glob":
					if (result?.trim()) return `\`\`\`\n${result}\n\`\`\``;
					return "*No matches found*";
				default:
					if (result?.trim()) {
						if (result.includes("\n") && result.length > 100)
							return `\`\`\`\n${result}\n\`\`\``;
						return result;
					}
					return "*Completed*";
			}
		} catch {
			return result || "";
		}
	}
}
