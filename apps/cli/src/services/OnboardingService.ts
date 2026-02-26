import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";
import dotenv from "dotenv";
import type { Application } from "../Application.js";
import { AuthFlowService } from "./AuthFlowService.js";
import { RepoService } from "./RepoService.js";

export class OnboardingService {
	private rl: readline.Interface | null = null;
	private authFlow = new AuthFlowService();
	private repoService: RepoService;

	constructor(private readonly app: Application) {
		this.repoService = new RepoService(app.sylasHome);
	}

	async run(): Promise<boolean> {
		try {
			this.printWelcome();

			const clientId = await this.promptRequired("LINEAR_CLIENT_ID: ");
			const clientSecret = await this.promptRequired("LINEAR_CLIENT_SECRET: ");
			const baseUrl = await this.promptRequired(
				"SYLAS_BASE_URL (e.g., https://your-machine.tailnet.ts.net): ",
			);

			const envPath = join(this.app.sylasHome, ".env");
			const existing = existsSync(envPath)
				? readFileSync(envPath, "utf-8")
				: "";
			const parsed = dotenv.parse(existing);
			parsed.LINEAR_CLIENT_ID = clientId;
			parsed.LINEAR_CLIENT_SECRET = clientSecret;
			parsed.SYLAS_BASE_URL = baseUrl;
			const merged = Object.entries(parsed)
				.map(([k, v]) => `${k}=${v}`)
				.join("\n");
			writeFileSync(envPath, `${merged}\n`, "utf-8");

			dotenv.config({ path: envPath, override: true });

			if (!this.app.config.exists()) {
				this.app.config.save({ repositories: [] });
			}

			console.log("\nStarting Linear OAuth...");
			const authCode = await this.authFlow.waitForCallback(clientId);
			const tokens = await this.authFlow.exchangeCodeForTokens(
				authCode,
				clientId,
				clientSecret,
			);
			const workspace = await this.authFlow.fetchWorkspaceInfo(
				tokens.accessToken,
			);
			console.log(`Connected workspace: ${workspace.name}`);

			const repoUrl = await this.repoService.promptForRepoUrl((question) =>
				this.prompt(question),
			);

			const configPath = this.app.config.getConfigPath();
			const config = this.app.config.load();
			if (!config.repositories) {
				config.repositories = [];
			}

			await this.repoService.cloneAndAddRepo({
				url: repoUrl,
				config,
				configPath,
				credentials: {
					id: workspace.id,
					name: workspace.name,
					token: tokens.accessToken,
					refreshToken: tokens.refreshToken,
				},
			});

			console.log("\nSetup complete. Starting Sylas...");
			return true;
		} catch (error) {
			this.app.logger.error(`Onboarding failed: ${(error as Error).message}`);
			return false;
		} finally {
			await this.authFlow.cleanup();
			this.cleanupReadline();
		}
	}

	private printWelcome(): void {
		console.log("\nWelcome to Sylas.");
		console.log("Let's run first-time setup.");
		if (!existsSync(this.app.config.getConfigPath())) {
			console.log(
				"We'll create your config and connect your first repository.",
			);
		}
		console.log();
	}

	private getReadline(): readline.Interface {
		if (!this.rl) {
			this.rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});
		}

		return this.rl;
	}

	private prompt(question: string): Promise<string> {
		return new Promise((resolve) => {
			this.getReadline().question(question, (answer) => resolve(answer.trim()));
		});
	}

	private async promptRequired(question: string): Promise<string> {
		let value = "";
		while (!value) {
			value = await this.prompt(question);
			if (!value) {
				console.log("This value is required.");
			}
		}
		return value;
	}

	private cleanupReadline(): void {
		if (this.rl) {
			this.rl.close();
			this.rl = null;
		}
	}
}
