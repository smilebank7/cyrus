import { exec } from "node:child_process";

/**
 * Open a URL in the default browser using platform-native commands.
 * Replaces the `open` npm package to avoid transitive dependency issues
 * (define-lazy-prop ESM resolution bug in bunx).
 */
export async function openUrl(url: string): Promise<void> {
	const platform = process.platform;
	let command: string;

	switch (platform) {
		case "darwin":
			command = `open ${JSON.stringify(url)}`;
			break;
		case "win32":
			command = `start "" ${JSON.stringify(url)}`;
			break;
		default:
			// Linux and other Unix-like systems
			command = `xdg-open ${JSON.stringify(url)}`;
			break;
	}

	return new Promise((resolve, reject) => {
		exec(command, (error) => {
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
}
