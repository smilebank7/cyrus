# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
## [0.2.23] - 2026-02-26

### Changed
- **Unified CLI onboarding** — `sylas start` now guides first-time users through interactive setup (Linear auth, repository config, environment variables) when no repositories are configured. ([LJH-113](https://linear.app/leejhin/issue/LJH-113/), [#7](https://github.com/smilebank7/sylas/pull/7))
- **Full-delegation mode only** — Removed the procedure/subroutine system. Sylas now runs a single AI session per issue with full autonomy, simplifying the execution model. ([LJH-112](https://linear.app/leejhin/issue/LJH-112/), [#7](https://github.com/smilebank7/sylas/pull/7))
- **Runners consolidated to OpenCode + Claude** — Gemini, Cursor, and Codex runners are temporarily disabled and fall back to OpenCode. Only `omo`/`opencode` and `omc`/`claude` runner labels are active. ([LJH-82](https://linear.app/leejhin/issue/LJH-82/), [LJH-83](https://linear.app/leejhin/issue/LJH-83/), [LJH-84](https://linear.app/leejhin/issue/LJH-84/), [#7](https://github.com/smilebank7/sylas/pull/7))
## [0.2.22] - 2026-02-26
 ### Changed
 Migrated from pnpm to Bun as the package manager and from vitest to bun:test as the test runner. All CI, Docker, and dev workflows now use Bun. ([LJH-106](https://linear.app/leejhin/issue/LJH-106/), [#4](https://github.com/smilebank7/sylas/pull/4))
 **v2 Documentation & Branding** — README.md completely rewritten to reflect Sylas as a Cyrus fork with oh-my series multi-agent harnesses (OMO/OMC/OMX). Added architecture diagram, runner selection guide, feature overview, and v2 roadmap. AGENTS.md updated with three-harness architecture, deprecated Gemini/Cursor sections, and current package structure.
 Runner packages (opencode-runner, codex-runner, cursor-runner, gemini-runner, simple-agent-runner) are now optional peer dependencies, loaded dynamically at runtime. Only install the runners you need. ([#5](https://github.com/smilebank7/sylas/pull/5))
 Slack bot token is now read exclusively from the `SLACK_BOT_TOKEN` environment variable. The `X-Slack-Bot-Token` HTTP header is no longer supported. ([CYPACK-824](https://linear.app/ceedar/issue/CYPACK-824), [#876](https://github.com/smilebank7/sylas/pull/876))
 Slack agent sessions now run in transient empty directories instead of git worktrees, and subsequent @mentions in the same thread share the same session context. ([CYPACK-815](https://linear.app/ceedar/issue/CYPACK-815), [#868](https://github.com/smilebank7/sylas/pull/868))
 **Agent and model selectors now work across Claude, Gemini, and Codex** - You can now set runner and model directly in issue descriptions using `[agent=claude|gemini|codex]` and `[model=<model-name>]`. ([#850](https://github.com/smilebank7/sylas/pull/850))
 **Codex tool activity is now visible in Linear sessions** ([#850](https://github.com/smilebank7/sylas/pull/850))
 **Codex todo output now renders as proper checklists** ([#850](https://github.com/smilebank7/sylas/pull/850))
 **Major new feature: Cursor agent harness support** ([CYPACK-804](https://linear.app/ceedar/issue/CYPACK-804), [#858](https://github.com/smilebank7/sylas/pull/858))
 **Sylas MCP tools now run on the built-in server endpoint with authenticated Codex access** ([CYPACK-817](https://linear.app/ceedar/issue/CYPACK-817), [#870](https://github.com/smilebank7/sylas/pull/870))
### Added
 GitHub PR comment support: Sylas can now be triggered by `@sylasagent` mentions on GitHub pull request comments, creating sessions and posting replies directly on PRs. ([CYPACK-772](https://linear.app/ceedar/issue/CYPACK-772), [#820](https://github.com/smilebank7/sylas/pull/820))
 Slack integration: Sylas can now receive `@mention` webhooks from Slack channels and threads, enabling Slack as a new platform for triggering agent sessions. ([CYPACK-807](https://linear.app/ceedar/issue/CYPACK-807), [#861](https://github.com/smilebank7/sylas/pull/861))
 **`bunx sylas-ai` no longer fails with ESM resolution errors** — Replaced the `open` npm package with a lightweight native `child_process` utility for opening URLs, fixing `ERR_MODULE_NOT_FOUND` errors caused by bunx's inability to resolve transitive ESM dependencies (`define-lazy-prop`). ([#6](https://github.com/smilebank7/sylas/pull/6))
 **CLI build output no longer duplicates under `dist/src/`** — Fixed tsconfig `include` to compile only `src/**/*.ts`, preventing root-level files from creating a nested `dist/src/` directory structure in the published package. ([#6](https://github.com/smilebank7/sylas/pull/6))
 Summary subroutines now properly disable all tools including MCP tools like Linear's create_comment ([#808](https://github.com/smilebank7/sylas/pull/808))
 Procedures no longer fail when a subroutine exits with an error. Sylas now recovers by using the last successful subroutine's result. ([#818](https://github.com/smilebank7/sylas/pull/818))
 **Codex usage limit errors now display full message in Linear** ([CYPACK-804](https://linear.app/ceedar/issue/CYPACK-804), [#858](https://github.com/smilebank7/sylas/pull/858))
 **Cursor project .cursor/cli.json is now backed up and restored** ([CYPACK-804](https://linear.app/ceedar/issue/CYPACK-804), [#858](https://github.com/smilebank7/sylas/pull/858))
 **Cursor API key no longer in CLI args or logs** ([CYPACK-804](https://linear.app/ceedar/issue/CYPACK-804), [#858](https://github.com/smilebank7/sylas/pull/858))
 **Cursor completed todos now display as checked in Linear** ([CYPACK-804](https://linear.app/ceedar/issue/CYPACK-804), [#858](https://github.com/smilebank7/sylas/pull/858))
### Packages

#### sylas-cloudflare-tunnel-client
 sylas-cloudflare-tunnel-client@0.2.22

#### sylas-config-updater
 sylas-config-updater@0.2.22

#### sylas-linear-event-transport
 sylas-linear-event-transport@0.2.22

#### sylas-claude-runner
 sylas-claude-runner@0.2.22

#### sylas-core
 sylas-core@0.2.22

#### sylas-opencode-runner
 sylas-opencode-runner@0.2.22

#### sylas-codex-runner
 sylas-codex-runner@0.2.22

#### sylas-cursor-runner
 sylas-cursor-runner@0.2.22

#### sylas-simple-agent-runner
 sylas-simple-agent-runner@0.2.22

#### sylas-gemini-runner
 sylas-gemini-runner@0.2.22

#### sylas-mcp-tools
 sylas-mcp-tools@0.2.22

#### sylas-github-event-transport
 sylas-github-event-transport@0.2.22

#### sylas-slack-event-transport
 sylas-slack-event-transport@0.2.22

#### sylas-edge-worker
 sylas-edge-worker@0.2.22

#### sylas-ai (CLI)
 sylas-ai@0.2.22

## [0.2.21] - 2026-02-09

### Changed
- **Updated Claude SDK dependencies** - Updated `@anthropic-ai/claude-agent-sdk` to v0.2.34 and `@anthropic-ai/sdk` to v0.73.0. See [claude-agent-sdk changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#v0234) for details. ([CYPACK-788](https://linear.app/ceedar/issue/CYPACK-788), [#837](https://github.com/smilebank7/sylas/pull/837))
- **Improved task and tool activity display** - Task creation now shows as concise checklist items instead of verbose multi-line entries, task status updates display the task name with status emoji, and tool search/background task output activities are now cleanly formatted. ([CYPACK-795](https://linear.app/ceedar/issue/CYPACK-795), [#846](https://github.com/smilebank7/sylas/pull/846))
- **Task status updates now show task descriptions** - Task update and task detail activities now display the task subject alongside the task number (e.g., "Task #3 — Fix login bug") instead of just the number. ([CYPACK-797](https://linear.app/ceedar/issue/CYPACK-797), [#847](https://github.com/smilebank7/sylas/pull/847))

### Fixed
- **Procedures no longer fail when a subroutine exits with an error** - When a single-turn subroutine hits the max turns limit, Sylas now recovers by using the last successful subroutine's result, allowing the workflow to continue to completion instead of stopping mid-procedure. ([CYPACK-792](https://linear.app/ceedar/issue/CYPACK-792), [#843](https://github.com/smilebank7/sylas/pull/843))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.21

#### sylas-config-updater
- sylas-config-updater@0.2.21

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.21

#### sylas-claude-runner
- sylas-claude-runner@0.2.21

#### sylas-core
- sylas-core@0.2.21

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.21

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.21

#### sylas-edge-worker
- sylas-edge-worker@0.2.21

#### sylas-ai (CLI)
- sylas-ai@0.2.21

## [0.2.20] - 2026-02-05

### Fixed
- **Agent guidance for draft PRs now respected** - When your Linear workspace guidance specifies `--draft` or requests PRs remain as drafts, Sylas will no longer automatically convert them to ready for review. PRs also now correctly target the configured base branch instead of defaulting to main. ([CYPACK-784](https://linear.app/ceedar/issue/CYPACK-784), [#834](https://github.com/smilebank7/sylas/pull/834))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.20

#### sylas-config-updater
- sylas-config-updater@0.2.20

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.20

#### sylas-claude-runner
- sylas-claude-runner@0.2.20

#### sylas-core
- sylas-core@0.2.20

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.20

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.20

#### sylas-edge-worker
- sylas-edge-worker@0.2.20

#### sylas-ai (CLI)
- sylas-ai@0.2.20

## [0.2.19] - 2026-01-24

### Fixed
- Fixed configuration schema compatibility issue between sylas-hosted and local installations. ([#802](https://github.com/smilebank7/sylas/pull/802))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.19

#### sylas-config-updater
- sylas-config-updater@0.2.19

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.19

#### sylas-claude-runner
- sylas-claude-runner@0.2.19

#### sylas-core
- sylas-core@0.2.19

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.19

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.19

#### sylas-edge-worker
- sylas-edge-worker@0.2.19

#### sylas-ai (CLI)
- sylas-ai@0.2.19

## [0.2.18] - 2026-01-23

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.18

#### sylas-config-updater
- sylas-config-updater@0.2.18

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.18

#### sylas-claude-runner
- sylas-claude-runner@0.2.18

#### sylas-core
- sylas-core@0.2.18

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.18

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.18

#### sylas-edge-worker
- sylas-edge-worker@0.2.18

#### sylas-ai (CLI)
- sylas-ai@0.2.18

## [0.2.17] - 2026-01-23

### Added
- **Issue update awareness** - Sylas now detects when you edit an issue's title, description, or attachments while it's actively working on that issue. The agent receives context showing what changed (old vs new values) along with guidance to evaluate whether the update affects its implementation or action plan. TIP: instead of re-prompting Sylas in a comment or chat window, just update the issue description with additional acceptance criteria! It will auto-start or adjust course and apply changes. ([CYPACK-736](https://linear.app/ceedar/issue/CYPACK-736), [#782](https://github.com/smilebank7/sylas/pull/782))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.17

#### sylas-config-updater
- sylas-config-updater@0.2.17

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.17

#### sylas-claude-runner
- sylas-claude-runner@0.2.17

#### sylas-core
- sylas-core@0.2.17

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.17

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.17

#### sylas-edge-worker
- sylas-edge-worker@0.2.17

#### sylas-ai (CLI)
- sylas-ai@0.2.17

## [0.2.16] - 2026-01-23

### Added
- **User access control** - Added the ability to whitelist or blacklist Linear users from delegating issues to Sylas. Supports blocking specific users by Linear ID or email address, allowing only specific users (allowlist mode blocks everyone not explicitly listed), configurable block behavior (silent ignore or post comment), and template variables in block messages. Blocklist is additive (global + repo), while allowlist overrides (repo replaces global). Thanks to [@tjorri](https://github.com/tjorri) for the contribution! ([#779](https://github.com/smilebank7/sylas/pull/779))

### Improved
- **Better Cloudflare tunnel error messages** - When the Cloudflare tunnel fails to connect, Sylas now provides detailed troubleshooting guidance including common causes (firewall, VPN, proxy issues) and links to connectivity prechecks documentation. This helps users quickly identify and resolve network configuration issues preventing tunnel establishment. ([CYPACK-743](https://linear.app/ceedar/issue/CYPACK-743), [#788](https://github.com/smilebank7/sylas/pull/788))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.16

#### sylas-config-updater
- sylas-config-updater@0.2.16

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.16

#### sylas-claude-runner
- sylas-claude-runner@0.2.16

#### sylas-core
- sylas-core@0.2.16

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.16

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.16

#### sylas-edge-worker
- sylas-edge-worker@0.2.16

#### sylas-ai (CLI)
- sylas-ai@0.2.16

## [0.2.15] - 2026-01-16

### Added
- **Version endpoint** - Added a `/version` endpoint that returns the Sylas CLI version, enabling the dashboard to display version information. The endpoint returns `{ "sylas_cli_version": "x.y.z" }` or `null` if unavailable. ([CYPACK-731](https://linear.app/ceedar/issue/CYPACK-731), [#775](https://github.com/smilebank7/sylas/pull/775))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.15

#### sylas-config-updater
- sylas-config-updater@0.2.15

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.15

#### sylas-claude-runner
- sylas-claude-runner@0.2.15

#### sylas-core
- sylas-core@0.2.15

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.15

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.15

#### sylas-edge-worker
- sylas-edge-worker@0.2.15

#### sylas-ai (CLI)
- sylas-ai@0.2.15

## [0.2.14] - 2026-01-16

### Fixed
- **Cross-repository orchestration** - Fixed an issue where parent sessions could not be resumed when orchestrating sub-issues across different repositories. Child sessions now correctly locate and resume their parent sessions regardless of which repository they belong to. ([CYPACK-722](https://linear.app/ceedar/issue/CYPACK-722), [#768](https://github.com/smilebank7/sylas/pull/768))
- **Summary subroutines no longer show extended "Working" status** - During summarization phases (concise-summary, verbose-summary, question-answer, plan-summary, user-testing-summary, release-summary), the agent no longer makes tool calls that caused users to see an extended "Working" status in Linear. The agent now produces only text output during these phases. ([CYPACK-723](https://linear.app/ceedar/issue/CYPACK-723), [#764](https://github.com/smilebank7/sylas/pull/764))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.14

#### sylas-config-updater
- sylas-config-updater@0.2.14

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.14

#### sylas-claude-runner
- sylas-claude-runner@0.2.14

#### sylas-core
- sylas-core@0.2.14

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.14

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.14

#### sylas-edge-worker
- sylas-edge-worker@0.2.14

#### sylas-ai (CLI)
- sylas-ai@0.2.14

## [0.2.13] - 2026-01-15

### Added
- **Multi-repository orchestration routing context** - Orchestrator prompts now receive routing context when multiple repositories are configured in the same workspace. This enables orchestrators to intelligently route sub-issues to different repositories using description tags (`[repo=org/repo-name]`), routing labels, team keys, or project keys. ([CYPACK-711](https://linear.app/ceedar/issue/CYPACK-711), [#756](https://github.com/smilebank7/sylas/pull/756))

### Fixed
- **Usage limit errors now display as errors** - When hitting usage limits (rate_limit) or other SDK errors, the agent now creates an "error" type activity instead of a "thought" type, making error messages more visible to users in the Linear UI. ([CYPACK-719](https://linear.app/ceedar/issue/CYPACK-719), [#760](https://github.com/smilebank7/sylas/pull/760))

### Changed
- **Orchestrator label routing is now hardcoded** - Issues with 'orchestrator' or 'Orchestrator' labels now always route to the orchestrator procedure, regardless of EdgeConfig settings. This ensures consistent orchestrator behavior without requiring explicit configuration. ([CYPACK-715](https://linear.app/ceedar/issue/CYPACK-715), [#757](https://github.com/smilebank7/sylas/pull/757))
- **Updated dependencies** - Updated `@anthropic-ai/claude-agent-sdk` from 0.2.2 to 0.2.7 ([changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#027-2026-01-14)). This brings compatibility with Claude Code v2.1.7, which enables MCP tool search auto mode by default. When MCP tool descriptions exceed 10% of the context window, they are automatically deferred and discovered via the MCPSearch tool instead of being loaded upfront, reducing context usage for sessions with many MCP tools configured. ([CYPACK-716](https://linear.app/ceedar/issue/CYPACK-716), [#758](https://github.com/smilebank7/sylas/pull/758))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.13

#### sylas-config-updater
- sylas-config-updater@0.2.13

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.13

#### sylas-claude-runner
- sylas-claude-runner@0.2.13

#### sylas-core
- sylas-core@0.2.13

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.13

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.13

#### sylas-edge-worker
- sylas-edge-worker@0.2.13

#### sylas-ai (CLI)
- sylas-ai@0.2.13

## [0.2.12] - 2026-01-09

### Fixed
- **Case-insensitive label matching for orchestrator/debugger modes** - Label matching for orchestrator, debugger, builder, and scoper modes is now case-insensitive, matching the existing behavior of model selection. Labels like "Orchestrator" in Linear now correctly match config entries like `["orchestrator"]`. ([CYPACK-701](https://linear.app/ceedar/issue/CYPACK-701), [#746](https://github.com/smilebank7/sylas/pull/746))
- **Haiku model label support** - Fixed "haiku" as a supported model label for label-based model selection. Uses sonnet as fallback model for retry scenarios. ([CYPACK-701](https://linear.app/ceedar/issue/CYPACK-701), [#746](https://github.com/smilebank7/sylas/pull/746))

### Changed
- **Improved changelog handling** - Changelog updates now run as a separate subroutine before git operations, ensuring PR links can be included via amend. The `git-gh` subroutine has been split into `changelog-update`, `git-commit`, and `gh-pr` for better modularity. Non-changelog subroutines now explicitly avoid touching the changelog to prevent conflicts. ([CYPACK-670](https://linear.app/ceedar/issue/CYPACK-670), [#708](https://github.com/smilebank7/sylas/pull/708))
- **Updated dependencies** - Updated `@anthropic-ai/claude-agent-sdk` from 0.1.72 to 0.2.2 ([changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#020-2026-01-07)). Updated `zod` from 3.x to 4.3.5 to satisfy peer dependencies. Migrated from `zod-to-json-schema` to Zod v4's native `toJSONSchema()` method. ([CYPACK-700](https://linear.app/ceedar/issue/CYPACK-700), [#745](https://github.com/smilebank7/sylas/pull/745))

### Added
- **Worktree include support** - Add `.worktreeinclude` file support to automatically copy gitignored files (like `.env`, local configs) from the main repository to new worktrees. Files must be listed in both `.worktreeinclude` AND `.gitignore` to be copied. Supports glob patterns like `.env.*` and `**/.claude/settings.local.json`. ([CYPACK-690](https://linear.app/ceedar/issue/CYPACK-690), [#734](https://github.com/smilebank7/sylas/pull/734))
- **Screenshot upload guidance hooks** - Agents are now guided to use `linear_upload_file` when taking screenshots, ensuring screenshots are viewable in Linear comments instead of remaining as local files. Hooks added for `playwright_screenshot`, `mcp__claude-in-chrome__computer`, `mcp__claude-in-chrome__gif_creator`, and `mcp__chrome-devtools__take_screenshot`. ([CYPACK-699](https://linear.app/ceedar/issue/CYPACK-699), [#744](https://github.com/smilebank7/sylas/pull/744))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.12

#### sylas-config-updater
- sylas-config-updater@0.2.12

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.12

#### sylas-claude-runner
- sylas-claude-runner@0.2.12

#### sylas-core
- sylas-core@0.2.12

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.12

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.12

#### sylas-edge-worker
- sylas-edge-worker@0.2.12

#### sylas-ai (CLI)
- sylas-ai@0.2.12

## [0.2.11] - 2026-01-07

### Fixed
- **Repository tag routing now works with Linear's escaped brackets** - Fixed a bug where `[repo=...]` tags weren't recognized because Linear escapes square brackets in descriptions (e.g., `\[repo=sylas\]`). The parser now handles both escaped and unescaped formats. ([CYPACK-688](https://linear.app/ceedar/issue/CYPACK-688), [#738](https://github.com/smilebank7/sylas/pull/738))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.11

#### sylas-config-updater
- sylas-config-updater@0.2.11

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.11

#### sylas-claude-runner
- sylas-claude-runner@0.2.11

#### sylas-core
- sylas-core@0.2.11

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.11

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.11

#### sylas-edge-worker
- sylas-edge-worker@0.2.11

#### sylas-ai (CLI)
- sylas-ai@0.2.11

## [0.2.10] - 2026-01-06

### Added
- **Repository tag routing** - You can now specify which repository an issue should be routed to by adding a `[repo=...]` tag in the issue description. Supports `[repo=org/repo-name]` to match GitHub URLs, `[repo=repo-name]` to match by name, or `[repo=repo-id]` to match by ID. This takes precedence over label, project, and team-based routing. ([CYPACK-688](https://linear.app/ceedar/issue/CYPACK-688), [#732](https://github.com/smilebank7/sylas/pull/732))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.10

#### sylas-config-updater
- sylas-config-updater@0.2.10

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.10

#### sylas-claude-runner
- sylas-claude-runner@0.2.10

#### sylas-core
- sylas-core@0.2.10

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.10

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.10

#### sylas-edge-worker
- sylas-edge-worker@0.2.10

#### sylas-ai (CLI)
- sylas-ai@0.2.10

## [0.2.9] - 2025-12-30

### Added
- **Repository tag routing** - You can now specify which repository an issue should be routed to by adding a `[repo=...]` tag in the issue description. Supports `[repo=org/repo-name]` to match GitHub URLs, `[repo=repo-name]` to match by name, or `[repo=repo-id]` to match by ID. This takes precedence over label, project, and team-based routing. ([CYPACK-688](https://linear.app/ceedar/issue/CYPACK-688), [#732](https://github.com/smilebank7/sylas/pull/732))
- **GPT Image 1.5 support** - The image-tools MCP server now supports `gpt-image-1.5`, OpenAI's latest and highest quality image generation model. You can choose between `gpt-image-1.5` (default, best quality), `gpt-image-1`, or `gpt-image-1-mini` (faster, lower cost). ([CYPACK-675](https://linear.app/ceedar/issue/CYPACK-675), [#717](https://github.com/smilebank7/sylas/pull/717))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.9

#### sylas-config-updater
- sylas-config-updater@0.2.9

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.9

#### sylas-claude-runner
- sylas-claude-runner@0.2.9

#### sylas-core
- sylas-core@0.2.9

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.9

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.9

#### sylas-edge-worker
- sylas-edge-worker@0.2.9

#### sylas-ai (CLI)
- sylas-ai@0.2.9

## [0.2.8] - 2025-12-28

### Added
- **Release procedure** - Added a new `release` procedure with two subroutines for executing software releases. When an issue is classified as a release request, Sylas will: (1) check for a release skill in the project, (2) check CLAUDE.md or README.md for release instructions, or (3) ask the user via AskUserQuestion how to perform the release. This enables Sylas to handle release workflows for any project type. ([CYPACK-668](https://linear.app/ceedar/issue/CYPACK-668), [#706](https://github.com/smilebank7/sylas/pull/706))
- **Self-hosting OAuth commands** - New CLI commands for self-hosted deployments: `sylas self-auth` performs direct Linear OAuth authorization without a proxy, and `sylas self-add-repo` clones repositories and adds them to config with inherited workspace credentials. Both commands support the `--sylas-home` flag for custom configuration directories. See the [Self-Hosting Guide](./docs/SELF_HOSTING.md) for setup instructions. Based on the [original OAuth implementation](https://github.com/grandmore/sylas-self-hosting/pull/1) contributed by Stuart and the Grandmore team. ([CYPACK-669](https://linear.app/ceedar/issue/CYPACK-669), [#707](https://github.com/smilebank7/sylas/pull/707))

### Changed
- **Documentation restructured** - Moved self-hosting documentation from `selfhosting/` folder to `docs/` with separate files: `SELF_HOSTING.md` (main guide), `CONFIG_FILE.md` (configuration reference), and `CLOUDFLARE_TUNNEL.md` (optional tunnel setup). Main README now links to these docs. ([CYPACK-669](https://linear.app/ceedar/issue/CYPACK-669), [#707](https://github.com/smilebank7/sylas/pull/707))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.8

#### sylas-config-updater
- sylas-config-updater@0.2.8

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.8

#### sylas-claude-runner
- sylas-claude-runner@0.2.8

#### sylas-core
- sylas-core@0.2.8

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.8

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.8

#### sylas-edge-worker
- sylas-edge-worker@0.2.8

#### sylas-ai (CLI)
- sylas-ai@0.2.8

## [0.2.7] - 2025-12-28

### Fixed
- **AskUserQuestion UI cleanup** - The AskUserQuestion tool no longer appears as raw JSON in Linear's activity stream. Since the tool is custom-handled via Linear's select signal elicitation, the tool call and result are now suppressed from the activity UI for a cleaner experience. ([CYPACK-654](https://linear.app/ceedar/issue/CYPACK-654), [#698](https://github.com/smilebank7/sylas/pull/698))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.7

#### sylas-config-updater
- sylas-config-updater@0.2.7

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.7

#### sylas-claude-runner
- sylas-claude-runner@0.2.7

#### sylas-core
- sylas-core@0.2.7

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.7

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.7

#### sylas-edge-worker
- sylas-edge-worker@0.2.7

#### sylas-ai (CLI)
- sylas-ai@0.2.7

## [0.2.6] - 2025-12-22

### Changed
- **Default model upgraded to Opus** - Sylas now uses Claude Opus as the default model with Sonnet as fallback (previously Sonnet with Haiku fallback). This provides higher quality responses for all tasks. ([CYPACK-613](https://linear.app/ceedar/issue/CYPACK-613))
- Updated `@anthropic-ai/claude-agent-sdk` from v0.1.69 to v0.1.72 to maintain parity with Claude Code v2.0.72. This update includes fixed `/context` command behavior to respect custom system prompts, improved non-streaming performance for single-turn queries, and renamed V2 session API method from `receive()` to `stream()`. See the [Claude Agent SDK changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#0172) for full details. ([CYPACK-618](https://linear.app/ceedar/issue/CYPACK-618))

### Added
- **Interactive clarification via AskUserQuestion** - Sylas can now ask you clarifying questions during task execution using Linear's select signal. When Claude needs to make a decision with multiple valid options (e.g., which sorting algorithm, which library to use), it will present the options in Linear and wait for your selection before proceeding. This enables more interactive and accurate task completion. ([CYPACK-654](https://linear.app/ceedar/issue/CYPACK-654), [#691](https://github.com/smilebank7/sylas/pull/691))
- **Custom Skills support** - Sylas now supports Claude Skills, allowing you to extend Sylas with your own packaged capabilities. Create `SKILL.md` files in your project's `.claude/skills/` directory or personal `~/.claude/skills/` directory, and Sylas will automatically discover and use them when relevant. See the [Skills documentation](https://code.claude.com/docs/en/skills) for details on creating Skills. ([CYPACK-655](https://linear.app/ceedar/issue/CYPACK-655), [#690](https://github.com/smilebank7/sylas/pull/690))
- **Acceptance criteria validation** - The verifications subroutine now fetches the Linear issue and validates the implementation against all acceptance criteria. Failing to meet acceptance criteria counts as a failed verification, ensuring requirements are fully satisfied before proceeding to commit and PR creation. ([CYPACK-649](https://linear.app/ceedar/issue/CYPACK-649), [#687](https://github.com/smilebank7/sylas/pull/687))
- **Validation loop with retry logic** - When verifications fail during the full-development procedure, Sylas now automatically runs a fixer subroutine to address issues, then re-runs verification up to 4 times. Uses structured outputs with Zod schema validation for reliable pass/fail detection, with fallback parsing for Gemini compatibility. ([CYPACK-620](https://linear.app/ceedar/issue/CYPACK-620), [#666](https://github.com/smilebank7/sylas/pull/666))
- **Claude in Chrome integration** - EdgeWorker now enables Chrome browser automation via the Claude Agent SDK's `--chrome` flag, providing access to browser automation tools (screenshot recording, console reading, JavaScript execution, tab management) for main Sylas sessions. Simple agent runners explicitly disable this integration to keep lightweight queries fast. ([CYPACK-618](https://linear.app/ceedar/issue/CYPACK-618))
- **Process status endpoint** - Added `GET /status` endpoint that returns `{"status": "idle"}` or `{"status": "busy"}` to safely determine when Sylas can be restarted without interrupting active work. ([CYPACK-576](https://linear.app/ceedar/issue/CYPACK-576), [#632](https://github.com/smilebank7/sylas/pull/632))
- **Version logging on startup** - Sylas now displays the running version when the edge worker starts, making it easier to verify which version is deployed. ([CYPACK-585](https://linear.app/ceedar/issue/CYPACK-585))
- Added CLI platform mode support to enable in-memory issue tracking for testing and development ([CYPACK-509](https://linear.app/ceedar/issue/CYPACK-509))
- **User testing procedure** - New "user-testing" procedure for interactive, user-driven testing sessions. When you explicitly request manual testing (e.g., "test this for me", "run user testing"), Sylas will execute tests based on your instructions and provide a comprehensive summary of results and findings. ([CYPACK-542](https://linear.app/ceedar/issue/CYPACK-542))
- **Graphite workflow support** - Sylas now integrates with Graphite CLI for stacked PR workflows. Apply a "graphite" label to any issue to enable Graphite-aware behavior: sub-issues automatically branch from their blocking issue's branch (based on Linear's "blocked by" relationships) instead of main, and PRs are created using `gt submit`. For orchestrating complex multi-part features, apply both "graphite" and "orchestrator" labels - the orchestrator will create dependent sub-issues with proper blocking relationships that automatically stack in Graphite's dashboard. ([CYPACK-466](https://linear.app/ceedar/issue/CYPACK-466), [#577](https://github.com/smilebank7/sylas/pull/577))
- **Linear agent sessions MCP tools** - Added `linear_get_agent_sessions` and `linear_get_agent_session` tools to sylas-tools MCP server for retrieving agent session information from Linear. The tools support pagination, filtering, and provide comprehensive session details including timestamps, associated issues, and related entities. ([CYPACK-549](https://linear.app/ceedar/issue/CYPACK-549), [#625](https://github.com/smilebank7/sylas/pull/625))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.6

#### sylas-config-updater
- sylas-config-updater@0.2.6

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.6

#### sylas-claude-runner
- sylas-claude-runner@0.2.6

#### sylas-core
- sylas-core@0.2.6

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.6

#### sylas-gemini-runner
- sylas-gemini-runner@0.2.6

#### sylas-edge-worker
- sylas-edge-worker@0.2.6

#### sylas-ai (CLI)
- sylas-ai@0.2.6

## [0.2.5] - 2025-12-03

### Fixed
- Fixed Zod peer dependency mismatch in claude-runner that caused `mcp__sylas-tools__linear_agent_session_create` MCP tools to fail with `keyValidator._parse is not a function` error. Downgraded claude-runner's Zod dependency from v4.1.12 to v3.24.1 to match the Claude Agent SDK's peer dependency requirement ([CYPACK-478](https://linear.app/ceedar/issue/CYPACK-478), [#581](https://github.com/smilebank7/sylas/pull/581))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.5

#### sylas-config-updater
- sylas-config-updater@0.2.5

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.5

#### sylas-claude-runner
- sylas-claude-runner@0.2.5

#### sylas-core
- sylas-core@0.2.5

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.5

#### sylas-edge-worker
- sylas-edge-worker@0.2.5

#### sylas-ai (CLI)
- sylas-ai@0.2.5

## [0.2.4] - 2025-11-25

### Added
- **Google Gemini AI support** - Sylas now supports Google's Gemini models alongside Claude. Choose which AI processes your issues by adding labels to Linear issues: use `gemini`, `gemini-2.5-pro`, `gemini-2.5-flash`, or `gemini-3-pro` for Gemini models, or `claude`, `sonnet`, or `opus` for Claude models. If no AI label is present, Sylas defaults to Claude. This gives you flexibility to select the best AI for each task.

### Fixed
- Fixed race condition in subroutine transitions where new subroutines could start before the previous runner fully cleaned up, which could cause issues with session state management

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.4

#### sylas-config-updater
- sylas-config-updater@0.2.4

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.4

#### sylas-claude-runner
- sylas-claude-runner@0.2.4

#### sylas-core
- sylas-core@0.2.4

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.4

#### sylas-edge-worker
- sylas-edge-worker@0.2.4

#### sylas-ai (CLI)
- sylas-ai@0.2.4

## [0.2.3] - 2025-11-24

### Added
- **Claude Opus 4.5 support** - Sylas now has access to [Claude Opus 4.5](https://www.anthropic.com/claude/opus), Anthropic's most intelligent model with breakthrough capabilities in complex reasoning, advanced coding, and nuanced content creation. Experience significantly improved code generation, deeper analysis, and more sophisticated problem-solving across all Sylas workflows.

### Changed
- Updated @anthropic-ai/claude-agent-sdk from v0.1.42 to v0.1.52 - includes support for Claude Opus 4.5 and latest agent capabilities. See [@anthropic-ai/claude-agent-sdk v0.1.52 changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#0152) ([CYPACK-427](https://linear.app/ceedar/issue/CYPACK-427), [#558](https://github.com/smilebank7/sylas/pull/558))
- Updated @anthropic-ai/sdk from v0.69.0 to v0.71.0 - adds Claude Opus 4.5 model support with enhanced performance and capabilities. See [@anthropic-ai/sdk v0.71.0 changelog](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/CHANGELOG.md#0710-2025-11-22) ([CYPACK-427](https://linear.app/ceedar/issue/CYPACK-427), [#558](https://github.com/smilebank7/sylas/pull/558))

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.3

#### sylas-config-updater
- sylas-config-updater@0.2.3

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.3

#### sylas-claude-runner
- sylas-claude-runner@0.2.3

#### sylas-core
- sylas-core@0.2.3

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.3

#### sylas-edge-worker
- sylas-edge-worker@0.2.3

#### sylas-ai (CLI)
- sylas-ai@0.2.3

## [0.2.2] - 2025-11-19

### Changed
- Improved Linear agent-session tool formatting with custom formatters for better readability: Bash tool descriptions now appear in the action field with round brackets, Edit tool results display as unified diffs, and specialized parameter/result formatters for common tools (Read, Write, Grep, Glob, etc.) extract meaningful information instead of showing raw JSON (CYPACK-395, https://github.com/smilebank7/sylas/pull/512)

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.2

#### sylas-config-updater
- sylas-config-updater@0.2.2

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.2

#### sylas-claude-runner
- sylas-claude-runner@0.2.2

#### sylas-core
- sylas-core@0.2.2

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.2

#### sylas-edge-worker
- sylas-edge-worker@0.2.2

#### sylas-ai (CLI)
- sylas-ai@0.2.2

## [0.2.1] - 2025-11-15

### Added
- When no routing option matches, it will prompt the user to select which repo they'd like to run Sylas on for the Linear Issue. Repository selection now displays GitHub repository icons and formatted names when configured with a GitHub URL in the config file. The selected repository will be shown to the user, including what method was used to select it (label-based, team key based, project based, user-selected, etc)
- Restored `--env-file` option to specify custom environment variables file location (uses Commander library for CLI parsing)

### Changed
- Updated @anthropic-ai/claude-agent-sdk from v0.1.31 to v0.1.42 - see [@anthropic-ai/claude-agent-sdk v0.1.42 changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#0142)
- Updated @anthropic-ai/sdk from v0.68.0 to v0.69.0 - adds support for structured outputs beta - see [@anthropic-ai/sdk v0.69.0 changelog](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/CHANGELOG.md#0690-2025-11-14)

### Fixed
- Fixed Linear profile URLs in summary subroutines to use correct workspace slug instead of hardcoded "linear" workspace

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.1

#### sylas-config-updater
- sylas-config-updater@0.2.1

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.1

#### sylas-claude-runner
- sylas-claude-runner@0.2.1

#### sylas-core
- sylas-core@0.2.1

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.1

#### sylas-edge-worker
- sylas-edge-worker@0.2.1

#### sylas-ai (CLI)
- sylas-ai@0.2.1

## [0.2.0] - 2025-11-07

### Added
- **Cloudflare Tunnel Transport Client**: New `sylas-cloudflare-tunnel-client` package for receiving configuration updates and webhooks from sylas-hosted
  - Uses Cloudflare tunnels via `cloudflared` npm package for secure communication
  - Validates customer subscriptions with sylas-hosted API
  - Handles configuration updates (repositories, environment variables, MCP servers)
  - Receives Linear webhook payloads forwarded through sylas-hosted
  - Repository management (automatically clones/verifies repositories to `~/.sylas/repos/<repo-name>`)
  - All file operations restricted to `~/.sylas` directory for security
  - Will replace `ndjson-client` for customers using sylas-hosted service
- **Setup Waiting Mode**: After running `sylas auth`, the client now enters a waiting state to receive configuration from the server
  - Automatically starts server infrastructure (SharedApplicationServer, ConfigUpdater) without repositories
  - Displays clear waiting status and instructions to complete setup
  - Auto-transitions to normal operation when server pushes repository configuration
  - Watches config.json for changes and starts EdgeWorker when repositories are added

### Fixed
- Sylas client now stays running when all repositories are removed after onboarding, allowing it to receive new configuration from app.sylas.leejh.in
- Orchestrator label now enforces orchestrator procedure consistently - issues with the Orchestrator label always use the orchestrator-full procedure, even when receiving results from child sub-agents or processing new messages
- Suppressed unnecessary error logs when stopping Claude sessions
- Repository deletion now works correctly when triggered from the web UI
- Added missing `routingLabels` and `projectKeys` fields to `SylasConfigPayload` type in config-updater package
- Config handler now properly processes and saves label routing and project routing parameters when received from sylas-hosted
- Fixed missing `dist/` directory in published packages by adding `"files": ["dist"]` to `cloudflare-tunnel-client` and `config-updater` package.json files
- All packages now include their compiled TypeScript output when installed from npm

### Changed
- **Linear Event Transport**: Refactored `sylas-linear-webhook-client` to `sylas-linear-event-transport` for simplified webhook handling
  - Package now directly registers /webhook endpoint with Fastify server
  - Supports dual verification modes: direct Linear webhooks (LINEAR_DIRECT_WEBHOOKS) and proxy authentication
  - Removed complex transport abstractions (WebhookTransport, BaseTransport) in favor of direct route registration
  - Routes registered after server startup for improved initialization flow
- **Simplified CLI startup**: Removed legacy onboarding flows and subscription validation
  - Cloudflare tunnel now starts automatically when CLOUDFLARE_TOKEN is present
  - Removed Pro plan prompts and customer validation code
  - Removed `billing` and `set-customer-id` commands
  - Streamlined `auth` command to focus on authentication only
  - All tunnel management now handled by SharedApplicationServer
- Updated @anthropic-ai/claude-agent-sdk from v0.1.28 to v0.1.31 - see [@anthropic-ai/claude-agent-sdk v0.1.31 changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#0131)
- Updated @anthropic-ai/sdk from v0.67.0 to v0.68.0 - see [@anthropic-ai/sdk v0.68.0 changelog](https://github.com/anthropics/anthropic-sdk-typescript/compare/sdk-v0.67.0...sdk-v0.68.0)

### Removed
- **Subscription service**: Removed customer validation and subscription checking code
- **Billing commands**: Removed `billing` and `set-customer-id` CLI commands
- **Deprecated config parameter**: Removed `isLegacy` from EdgeConfig (replaced by setup waiting mode)

### Packages

#### sylas-cloudflare-tunnel-client
- sylas-cloudflare-tunnel-client@0.2.0

#### sylas-config-updater
- sylas-config-updater@0.2.0

#### sylas-linear-event-transport
- sylas-linear-event-transport@0.2.0

#### sylas-claude-runner
- sylas-claude-runner@0.2.0

#### sylas-core
- sylas-core@0.2.0

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.2.0

#### sylas-edge-worker
- sylas-edge-worker@0.2.0

#### sylas-ai (CLI)
- sylas-ai@0.2.0

## [0.1.60] - 2025-11-03

### Fixed
- Orchestrator label now enforces orchestrator procedure consistently - issues with the Orchestrator label always use the orchestrator-full procedure, even when receiving results from child sub-agents or processing new messages
- Suppressed unnecessary error logs when stopping Claude sessions

### Changed
- Updated @anthropic-ai/claude-agent-sdk from v0.1.28 to v0.1.31
- Updated @anthropic-ai/sdk from v0.67.0 to v0.68.0 - see [@anthropic-ai/sdk v0.68.0 changelog](https://github.com/anthropics/anthropic-sdk-typescript/compare/sdk-v0.67.0...sdk-v0.68.0)

### Packages

#### sylas-core
- sylas-core@0.0.21

#### sylas-claude-runner
- sylas-claude-runner@0.0.32

#### sylas-edge-worker
- sylas-edge-worker@0.0.41

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.25

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.0.4

#### sylas-ai (CLI)
- sylas-ai@0.1.60

## [0.1.59] - 2025-10-31

### Fixed
- Skip loading 'primary' subroutine prompt to eliminate ENOENT error in logs - the "primary" promptPath is a placeholder with no corresponding file

### Packages

#### sylas-core
- sylas-core@0.0.20

#### sylas-edge-worker
- sylas-edge-worker@0.0.40

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.0.3

#### sylas-ai (CLI)
- sylas-ai@0.1.59

## [0.1.58] - 2025-10-29

### Added
- Orchestrator and sub-issue communication is now visible in Linear activity: feedback from orchestrator to sub-issues and results from sub-issues to orchestrator are posted as thoughts with clear context

### Fixed
- Procedure routing is now reset when resuming parent sessions from child completion, preventing excessive thought and action suppression logs
- Fixed bug where initial subroutine prompts were not applied to comment-triggered new sessions (only worked for assignment-based sessions)
- Improved routing classification to correctly identify test-related requests (e.g., "add unit tests", "fix failing tests") as code work instead of planning tasks

### Changed
- Debugger workflow now proceeds directly from bug reproduction to fix implementation without requiring manual approval
- All workflows (full-development, debugger-full, orchestrator-full) now end with concise summary instead of verbose summary
- Non-summary subroutines (debugger-fix, debugger-reproduction, verifications, git-gh) now explicitly avoid posting Linear comments and end with brief 1-sentence completion messages
- Orchestrator agents are now strongly discouraged from posting Linear comments to current issues; comments only used when triggering sub-agent sessions on child issues
- Orchestrator agents are explicitly instructed not to assign themselves (Sylas) as a delegate when creating sub-issues
- Tool call result outputs are no longer wrapped in collapsible sections in Linear comments
- Concise summary format now uses collapsible sections for "Changes Made" and "Files Modified" to keep summaries brief
- Simple-question workflow now has two phases: investigation (gather information without answering) and answer formatting (provide markdown-formatted response)
- Initial subroutine prompts are now consistently loaded for all new sessions (assignment-based and comment-based), ensuring agents receive proper workflow guidance from the start
- Full-development workflow now starts with dedicated coding-activity subroutine (implementation and testing only, no git/gh operations)

### Packages

#### sylas-core
- sylas-core@0.0.20

#### sylas-edge-worker
- sylas-edge-worker@0.0.40

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.0.3

#### sylas-ai (CLI)
- sylas-ai@0.1.58

## [0.1.57] - 2025-10-12

### Fixed
- Fixed missing `sylas-simple-agent-runner` package publication that broke installation of sylas-ai@0.1.56

### Packages

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.0.2

#### sylas-edge-worker
- sylas-edge-worker@0.0.39

#### sylas-ai (CLI)
- sylas-ai@0.1.57

## [0.1.56] - 2025-10-12

### Added
- **Intelligent procedure routing**: Sylas now automatically selects the best workflow for each task by analyzing the request content. Simple questions get quick answers, documentation edits proceed directly to implementation, and code changes get the full workflow with verifications and git operations. Uses fast "haiku" model for 10-second classification.
- **Modular subroutine system**: Workflows are composed of reusable subroutines (verifications, git-gh, concise-summary, verbose-summary) that can be mixed and matched based on the procedure selected.
- **Environment variable support in MCP configs**: MCP configuration files can now reference environment variables from repository `.env` files using `${VAR}` and `${VAR:-default}` syntax, making it easier to manage API tokens and other sensitive configuration values
- **Sora 2 video generation support**: Added custom MCP tools for OpenAI Sora 2 video generation with three tools: `mcp__sora-tools__sora_generate_video` to start video generation (supports text-to-video and image-to-video via `input_reference` parameter; reference images must match target video resolution and be in JPEG, PNG, or WebP format only), `mcp__sora-tools__sora_check_status` to poll job status, and `mcp__sora-tools__sora_get_video` to download completed videos
- **Simple agent runner package**: Added new `sylas-simple-agent-runner` package for constrained agent queries that return one of a predefined set of responses (e.g., "yes", "no"). Features type-safe enumerated responses, comprehensive error handling, and progress tracking.
- **Image generation support**: Added GPT Image tools using OpenAI's Responses API with background mode. Two tools provide async image generation: `mcp__image-tools__gpt_image_generate` starts async image generation and returns a job ID, and `mcp__image-tools__gpt_image_get` checks status and downloads the image if ready (returns "not ready" if incomplete - agents can call again). Supports customizable size (1024x1024, 1536x1024, 1024x1536, auto), quality (low/medium/high/auto), background transparency, and output formats (PNG/JPEG/WebP). Uses gpt-5 model for tool invocation.

### Changed
- Updated @anthropic-ai/claude-agent-sdk from v0.1.13 to v0.1.14 - includes parity updates with Claude Code v2.0.14. See [@anthropic-ai/claude-agent-sdk v0.1.14 changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#0114)
- **Breaking: OpenAI configuration naming**: Renamed repository config fields from `soraApiKey`/`soraOutputDirectory` to `openaiApiKey`/`openaiOutputDirectory` to reflect support for multiple OpenAI services (Sora and GPT Image). Update your repository config to use the new field names.

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.31

#### sylas-core
- sylas-core@0.0.19

#### sylas-edge-worker
- sylas-edge-worker@0.0.38

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.24

#### sylas-simple-agent-runner
- sylas-simple-agent-runner@0.0.2

#### sylas-ai (CLI)
- sylas-ai@0.1.56

## [0.1.55] - 2025-10-09

### Added
- **Dynamic configuration updates**: Sylas now automatically detects and applies changes to `~/.sylas/config.json` without requiring a restart
  - Add or remove repositories on the fly while Sylas continues running
  - Removed repositories stop all active sessions and post notification messages to Linear
  - Webhook connections automatically reconnect when tokens are updated
  - File watcher uses debouncing to handle rapid configuration changes smoothly

### Changed
- **Upgraded to official Linear MCP server**: Replaced the unofficial `@tacticlaunch/mcp-linear` stdio-based server with Linear's official HTTP-based MCP server (`https://mcp.linear.app/mcp`). This provides better stability and access to the latest Linear API features.
- Updated @anthropic-ai/claude-agent-sdk from v0.1.10 to v0.1.11 - includes parity updates with Claude Code v2.0.11. See [@anthropic-ai/claude-agent-sdk v0.1.11 changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#0111---2025-01-09)

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.30

#### sylas-core
- sylas-core@0.0.18

#### sylas-edge-worker
- sylas-edge-worker@0.0.37

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.23

#### sylas-ai (CLI)
- sylas-ai@0.1.55

## [0.1.54] - 2025-10-04

### Added
- **Automatic MCP config detection**: Sylas now automatically detects and loads `.mcp.json` files in the repository root. The `.mcp.json` serves as a base configuration that can be extended by explicit `mcpConfigPath` settings, allowing for composable MCP server configurations.

### Fixed
- **Custom instructions now work correctly**: Fixed critical bug where `appendSystemPrompt` was being silently ignored, causing Sylas to not follow custom instructions or agent guidance. The feature has been fixed to use the correct SDK API (`systemPrompt.append`), making custom prompts and Linear agent guidance work as intended.

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.29

#### sylas-core
- sylas-core@0.0.17

#### sylas-edge-worker
- sylas-edge-worker@0.0.36

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.22

#### sylas-ai (CLI)
- sylas-ai@0.1.54

## [0.1.53] - 2025-10-04

### Added
- **Agent guidance injection**: Sylas now automatically receives and includes both workspace-level and team-specific agent guidance from Linear in all prompts. When both types of guidance are configured, both are included in the prompt, with team-specific guidance taking precedence as specified by Linear's guidance system.

### Changed
- Updated @linear/sdk from v58.1.0 to v60.0.0 to support agent guidance feature

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.28

#### sylas-core
- sylas-core@0.0.16

#### sylas-edge-worker
- sylas-edge-worker@0.0.35

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.21

#### sylas-ai (CLI)
- sylas-ai@0.1.53

## [0.1.52] - 2025-10-04

### Changed
- Version bump for all packages to ensure proper dependency resolution

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.27

#### sylas-core
- sylas-core@0.0.15

#### sylas-edge-worker
- sylas-edge-worker@0.0.34

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.20

#### sylas-ai (CLI)
- sylas-ai@0.1.52

## [0.1.51] - 2025-10-04

### Fixed
- **Restored file-based settings loading**: Fixed regression from claude-agent-sdk update where CLAUDE.md files, settings files, and custom slash commands were not being loaded
  - Added explicit `settingSources: ["user", "project", "local"]` configuration to ClaudeRunner
  - This restores backwards compatibility with existing user configurations
  - See [Claude Code SDK Migration Guide](https://docs.claude.com/en/docs/claude-code/sdk/migration-guide#settings-sources-no-longer-loaded-by-default)

### Changed
- **Default model changed from opus to sonnet 4.5**: The default Claude model is now `sonnet` instead of `opus`
  - Fallback model changed from `sonnet` to `haiku`
  - Label-based model selection still available - users can add `opus`, `sonnet`, or `haiku` labels to issues to override the default
  - Affects all new sessions that don't explicitly specify a model in config
- Updated @anthropic-ai/claude-agent-sdk from v0.1.0 to v0.1.5 for latest Claude Agent SDK improvements
- Updated @anthropic-ai/sdk from v0.64.0 to v0.65.0 for latest Anthropic SDK improvements
  - Added support for Claude Sonnet 4.5 and context management features
  - See [@anthropic-ai/sdk v0.65.0 changelog](https://github.com/anthropics/anthropic-sdk-typescript/compare/sdk-v0.64.0...sdk-v0.65.0)

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.26

#### sylas-core
- sylas-core@0.0.14

#### sylas-edge-worker
- sylas-edge-worker@0.0.33

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.19

#### sylas-ai (CLI)
- sylas-ai@0.1.51

## [0.1.50] - 2025-09-30

### Added
- **Global setup script support**: Added `global_setup_script` optional field in config.json
  - Runs before repository-specific `sylas-setup.sh` when creating git worktrees
  - Supports ~ expansion for home directory paths
  - Same environment variables passed to both global and repository scripts (LINEAR_ISSUE_ID, LINEAR_ISSUE_IDENTIFIER, LINEAR_ISSUE_TITLE)
  - 5-minute timeout to prevent hanging scripts
  - Comprehensive error handling and logging for both global and repository scripts
  - Script failures don't prevent worktree creation
  - Cross-platform support (bash, PowerShell, cmd, bat)

- **Ephemeral agent activities for tool calls**: Standard tool calls now post ephemeral activities to Linear
  - Tool calls (except Task and TodoWrite) create ephemeral activities that disappear when replaced
  - Tool responses create non-ephemeral activities showing original tool name and input
  - Tool outputs are wrapped in `+++Tool Output` collapsible blocks (collapsed by default)
  - Tool errors display as "{ToolName} (Error)" for better clarity
  - Subtasks maintain arrow emoji (↪) prefix for visual hierarchy
  - TodoWrite tool results are skipped to prevent duplicate activities
  - Reduces visual clutter in Linear while preserving important information

### Changed
- **Linear SDK upgraded to v58.1.0**: Updated across all packages to support ephemeral agent activity field
  - Added `ephemeral: boolean` support for agent activities
  - Maintained backward compatibility with existing non-ephemeral activities

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.26

#### sylas-core
- sylas-core@0.0.14

#### sylas-edge-worker
- sylas-edge-worker@0.0.33

#### sylas-linear-webhook-client
- sylas-linear-webhook-client@0.0.3

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.19

## [0.1.49] - 2025-09-29

### Changed
- **Migrated from Claude Code SDK to Claude Agent SDK**: Replaced `@anthropic-ai/claude-code` v1.0.128 with `@anthropic-ai/claude-agent-sdk` v0.1.0
  - Updated all imports and type references to use the new package name
  - Handled breaking change: SDK no longer uses Claude Code's system prompt by default - now explicitly requests Claude Code preset to maintain backward compatibility
  - No changes needed for settings sources as the codebase doesn't rely on automatic settings file loading
- Updated @anthropic-ai/sdk from v0.62.0 to v0.64.0 for latest Anthropic SDK improvements

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.25

#### sylas-core
- sylas-core@0.0.13

#### sylas-edge-worker
- sylas-edge-worker@0.0.32

#### sylas-ai (CLI)
- sylas-ai@0.1.49

## [0.1.48] - 2025-01-11

### Added
- **Direct OAuth authorization support**: The CLI can now handle OAuth authorization directly when `LINEAR_DIRECT_WEBHOOKS=true`
  - New `/oauth/authorize` endpoint in SharedApplicationServer for self-hosted OAuth flow
  - Automatic OAuth code exchange when using direct webhooks mode
  - Support for custom Linear OAuth applications via `LINEAR_CLIENT_ID` and `LINEAR_CLIENT_SECRET` environment variables
  - Maintains backward compatibility with proxy-based OAuth for standard deployments

### Packages

#### sylas-edge-worker
- sylas-edge-worker@0.0.31

#### sylas-ai (CLI)
- sylas-ai@0.1.48

## [0.1.47] - 2025-01-09

### Fixed
- Fixed webhook signature verification for LinearWebhookClient
  - Corrected signature verification to properly handle webhook payloads
  - Ensures webhook authenticity when using direct webhook forwarding mode
  - Resolves security validation issues in direct webhook configurations

### Packages

#### sylas-linear-webhook-client
- sylas-linear-webhook-client@0.0.2

#### sylas-edge-worker
- sylas-edge-worker@0.0.30

#### sylas-ai (CLI)
- sylas-ai@0.1.47

## [0.1.46] - 2025-01-09

### Added
- **Dynamic webhook client selection**: Support for choosing between proxy-based and direct webhook forwarding
  - New environment variable `LINEAR_DIRECT_WEBHOOKS` to control webhook client selection
  - When `LINEAR_DIRECT_WEBHOOKS=true`, uses new `linear-webhook-client` package for direct webhook forwarding
  - When unset or `false`, uses existing `ndjson-client` for proxy-based webhook handling
  - Maintains full backward compatibility with existing deployments
- **Sub-issue assignee inheritance with workspace context**: Sub-issues created by orchestrator agents now automatically inherit the same assignee as their parent issue, with complete workspace awareness
  - Enhanced label-prompt-template to include assignee information (`{{assignee_id}}` and `{{assignee_name}}`)
  - Added workspace teams context (`{{workspace_teams}}`) with team names, keys, IDs, and descriptions
  - Added workspace labels context (`{{workspace_labels}}`) with label names, IDs, and descriptions  
  - Updated orchestrator prompt instructions to require `assigneeId` parameter in sub-issue creation
  - Modified EdgeWorker to fetch and inject Linear workspace data (teams, labels, assignee) into orchestrator context
- **Mandatory verification framework for orchestrator agents**: Enhanced parent-child delegation with executable verification requirements
  - Parent orchestrators can now access child agent worktrees for independent verification
  - **Orchestrator prompt v2.2.0** with mandatory verification requirements in sub-issue descriptions
  - Child agents must provide detailed verification instructions (commands, expected outcomes, visual evidence)
  - Parents gain filesystem permissions to child worktrees during verification process
  - No more "verification theater" - actual executable validation required before merging child work
- **@sylas /label-based-prompt command**: New special command for mention-triggered sessions
  - Use `@sylas /label-based-prompt` in comments to trigger label-based prompts instead of mention prompts
  - Automatically determines and includes appropriate system prompts based on issue labels
  - Maintains full backwards compatibility with regular `@sylas` mentions
  - Logged as "label-based-prompt-command" workflow type for easy identification
- **Tool restriction configuration**: New `disallowedTools` configuration option to explicitly block specific tools
  - Can be configured at global, repository, prompt type, and label-specific levels
  - Follows same hierarchy as `allowedTools` (label > prompt defaults > repository > global)
  - No default disallowed tools - only explicitly configured tools are blocked
  - Environment variable support: `DISALLOWED_TOOLS` for global defaults
  - Passed through to Claude Code via `disallowedTools` option
- **New Linear MCP tool**: `linear_agent_session_create_on_comment` for creating agent sessions on root comments
  - Enables orchestrator agents to trigger sub-agents on existing issue comment threads
  - Must be used with root comments only (not replies) due to Linear API constraints
  - Maintains parent-child session mapping for proper feedback routing

### Changed
- Updated @anthropic-ai/claude-code from v1.0.90 to v1.0.95 for latest Claude Code improvements. See [Claude Code v1.0.95 changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#1095)
- Replaced external sylas-mcp-tools MCP server with inline tools using SDK callbacks for better performance
- Sylas tools (file upload, agent session creation, feedback) now run in-process instead of via separate MCP server
- Enhanced orchestrator prompt to explicitly require reading/viewing all screenshots taken for visual verification

### Removed
- Removed sylas-mcp-tools package in favor of inline tool implementation

## [0.1.45] - 2025-08-28

### Added
- New `sylas-mcp-tools` package providing MCP tools for Linear integration
  - File upload capability: Upload files to Linear and get asset URLs for use in issues and comments
  - Agent session creation: Create AI/bot tracking sessions on Linear issues
  - **Give feedback tool: Allows parent sessions to send feedback to child sessions**
  - Automatically available in all Sylas sessions without additional configuration
- PostToolUse hook integration for tracking parent-child agent session relationships
  - Automatically captures child agent session IDs when linear_agent_session_create tool is used
  - **Triggers child session resumption when linear_agent_give_feedback tool is used**
  - Maintains mapping of child sessions to parent sessions for hierarchical tracking
  - **Persistent storage of child-to-parent mappings across restarts**
  - Child session results are automatically forwarded to parent sessions upon completion
- New "orchestrator" label system prompt type
  - Joins existing "builder", "debugger", and "scoper" labels as a default option
  - Configured with read-only tools (cannot directly edit files)
  - Specializes in coordination and oversight of complex development tasks
  - Automatically triggered by "Orchestrator" label on Linear issues
- **Label-based Claude model selection**: You can now override the Claude model used for specific issues by adding labels
  - Add "opus", "sonnet", or "haiku" label to any Linear issue to force that model
  - Model labels take highest priority (overrides both repository and global settings)
  - Case-insensitive label matching for flexibility
  - Automatically sets appropriate fallback models (opus→sonnet, sonnet→haiku, haiku→haiku)

### Changed
- Updated @anthropic-ai/claude-code from v1.0.88 to v1.0.89 for latest Claude Code improvements. See [Claude Code v1.0.89 changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#1089)
- Upgraded @linear/sdk from v38/v55 to v58.0.0 across all packages for latest Linear API features
- Enhanced ClaudeRunner and EdgeWorker to support Claude Code SDK hooks for tool interception

### Packages

#### sylas-mcp-tools
- sylas-mcp-tools@0.3.0 - Already published (not part of this release)

#### sylas-core
- sylas-core@0.0.11

#### sylas-claude-runner
- sylas-claude-runner@0.0.23

#### sylas-edge-worker
- sylas-edge-worker@0.0.28

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.17

#### sylas-ai (CLI)
- sylas-ai@0.1.45

## [0.1.44] - 2025-08-19

### Changed
- Updated @anthropic-ai/claude-code dependency to use exact version (1.0.83) instead of caret range for improved consistency
- Updated CLAUDE.md documentation with clearer MCP Linear integration testing instructions

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.22

#### sylas-edge-worker
- sylas-edge-worker@0.0.27

#### sylas-ai (CLI)
- sylas-ai@0.1.44

## [0.1.43] - 2025-08-18

### Added
- Model configuration support for Claude Pro users
  - Configure Claude model selection (priority order: env vars → repository config → global config → defaults)
  - Environment variables: `SYLAS_DEFAULT_MODEL` and `SYLAS_DEFAULT_FALLBACK_MODEL`
  - Global config: `defaultModel` and `defaultFallbackModel` in `~/.sylas/config.json`
  - Repository-specific: `model` and `fallbackModel` fields per repository
  - Defaults: `"opus"` (primary) and `"sonnet"` (fallback)
  - Resolves errors for Claude Pro users who lack Opus model access

### Changed
- Updated @anthropic-ai/claude-code from v1.0.81 to v1.0.83 for latest Claude Code improvements. See [Claude Code v1.0.83 changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#1083)

### Fixed
- Fixed git worktree creation failures for sub-issues when parent branch doesn't exist remotely
  - Added proper remote branch existence checking before attempting worktree creation
  - Gracefully falls back to local parent branch or default base branch when remote parent branch is unavailable

### Packages

#### sylas-claude-runner  
- sylas-claude-runner@0.0.21

#### sylas-edge-worker
- sylas-edge-worker@0.0.26

#### sylas-ai (CLI)
- sylas-ai@0.1.43

## [0.1.42] - 2025-08-15

### Changed
- Updated @anthropic-ai/claude-code from v1.0.77 to v1.0.80 for latest Claude Code improvements. See [Claude Code v1.0.80 changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#1080)
- Updated @anthropic-ai/sdk from v0.59.0 to v0.60.0 for latest Anthropic SDK improvements

### Fixed
- Fixed issue where duplicate messages appeared in Linear when Claude provided final responses
  - Added consistent LAST_MESSAGE_MARKER to all prompt types to ensure Claude includes the special marker in final responses
  - Marker is automatically removed before posting to Linear, preventing duplicate content

### Packages

#### sylas-core
- sylas-core@0.0.10

#### sylas-claude-runner  
- sylas-claude-runner@0.0.20

#### sylas-edge-worker
- sylas-edge-worker@0.0.25

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.16

#### sylas-ai (CLI)
- sylas-ai@0.1.42

## [0.1.41] - 2025-08-13

### Added
- Dynamic tool configuration based on system prompt labels
  - Restrict Claude's tools per task type: give debugger mode only read access, builder mode safe tools, etc.
  - Use case: scoper can only read files, debugger can't use Bash, builder gets full access
  - Use presets (`"readOnly"`, `"safe"`, `"all"`) or custom tool lists in your `labelPrompts` config
  - Improves security and keeps Claude focused on the right tools for each job
  - See [Configuration docs](https://github.com/smilebank7/sylas#configuration) for setup details

### Changed
- Updated @anthropic-ai/claude-code from v1.0.72 to v1.0.73 for latest Claude Code improvements

### Fixed
- Fixed Windows compatibility issues that caused agent failures on Windows systems
  - Replaced Unix-specific `mkdir -p` commands with cross-platform Node.js `mkdirSync` 
  - Implemented intelligent shell script detection supporting Windows (.ps1, .bat, .cmd) and Unix (.sh) scripts
  - Added graceful fallback for Windows users with Git Bash/WSL to still use bash scripts
  - Resolves "A subdirectory or file -p already exists" and "bash command not found" errors
- Resolved issue where Sylas would fail to respond when it was initially delegated when the receiver was down
  - Now properly creates new sessions when prompted if none existed
  - Sessions are correctly initialized even when no prior session history exists
  - Improved code organization and type safety in session handling logic

### Packages

#### sylas-core
- sylas-core@0.0.10

#### sylas-claude-runner  
- sylas-claude-runner@0.0.19

#### sylas-edge-worker
- sylas-edge-worker@0.0.24

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.16

#### sylas-ai (CLI)
- sylas-ai@0.1.41

## [0.1.40] - 2025-08-10

### Added
- Customer subscription validation for Sylas Pro users
  - Automatically checks subscription status when using the default proxy with a customer ID
  - Blocks access if subscription is expired, cancelled, or invalid
  - Shows appropriate messages for returning customers vs new customers
  - Validates subscription when setting customer ID via `sylas set-customer-id` command
- Label-based repository routing - Route Linear issues to different git repositories based on their labels
  - New `routingLabels` configuration option allows specifying which labels should route to a specific repository
  - Useful when multiple repositories handle issues from the same Linear team (e.g., backend vs frontend repos)
  - Label routing takes precedence over team-based routing for more granular control

### Changed
- Updated Linear SDK from v54 to v55.1.0 to support Agent Activity Signals
  - Stop button in Linear UI now sends a deterministic `stop` signal that Sylas responds to immediately
  - When you click the stop button while Sylas is working, it will cleanly halt all operations and confirm the stop action
  - The stop signal implementation ensures no work continues after the stop is requested
- Updated Anthropic AI SDK from v0.57.0 to v0.59.0 and Claude Code from v1.0.61 to v1.0.72 for improved Claude integration

### Packages

#### sylas-core
- sylas-core@0.0.9

#### sylas-claude-runner  
- sylas-claude-runner@0.0.18

#### sylas-edge-worker
- sylas-edge-worker@0.0.23

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.15

#### sylas-ai (CLI)
- sylas-ai@0.1.40

## [0.1.39] - 2025-08-08

### Changed
- Simplified initial setup by removing configuration prompts for MCP, labels, Linear teams, allowed tools, and workspace directory
  - MCP configuration is now optional with no default prompt
  - Allowed tools default to all standard tools plus Bash(git:*) and Bash(gh:*) for immediate productivity
  - Label-based system prompts now have defaults: "Bug" for debugger mode, "Feature,Improvement" for builder mode, and "PRD" for scoper mode
  - Team-based routing defaults to all workspace issues (no team filtering)
  - Workspace directory automatically uses `~/.sylas/workspaces/<repo-name>`
  - Streamlined first-time user experience with sensible defaults

### Added
- Configuration documentation in README explaining all customizable settings
- Link to configuration docs in CLI output after setup completion

### Fixed
- Fixed duplicate OAuth authorization messages during Linear login flow while ensuring browser still opens automatically

### Packages

#### sylas-core
- sylas-core@0.0.8

#### sylas-claude-runner
- sylas-claude-runner@0.0.17

#### sylas-edge-worker
- sylas-edge-worker@0.0.22

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.15

#### sylas-ai (CLI)
- sylas-ai@0.1.39

## [0.1.38] - 2025-08-06

### Added
- Native Linear attachments (like Sentry error links) are now included in the issue context sent to Claude
  - Sylas now fetches attachments using Linear's native attachment API
  - Attachments appear in a dedicated "Linear Issue Links" section in the prompt
  - Particularly useful for Sentry error tracking links and other external integrations
- New command **`sylas add-repository`** - Add a new repository configuration, thanks new contributor @Maxim-Filimonov !
- Attachment support for comments - Sylas now downloads and provides access to attachments added in Linear comments
  - Attachments are automatically downloaded when users post comments with URLs or files
  - Downloaded to `~/.sylas/<workspace>/attachments` directory
  - Attachment manifest is generated and included in Claude's prompt
  - Attachments directory is always available to Claude during sessions
- Differentiation between issue delegation and @ mentions for more focused responses
  - @ mentions now trigger focused responses without system prompts
  - Delegations continue to use full system prompts for comprehensive task handling
  - Aligns with Linear's expected agent activity behavior
- Subscription management built right into the CLI (because who wants another dashboard?)
  - `sylas billing` - Opens your Stripe portal to manage subscription, payment methods, and download invoices
  - `sylas set-customer-id` - Saves your customer ID after signup (copy-paste friendly)
  - Interactive prompt on startup if you're using our proxy without a subscription
  - Self-hosting option for the DIY crowd who prefer their own Linear app and infrastructure
  - existed in v0.1.34 but was missing since then

### Fixed
- Fixed attachments not being accessible to Claude during active streaming sessions
  - Pre-create attachments directory for every session to ensure future attachments are accessible
  - Always include attachments directory in allowedDirectories configuration
- Fixed issue where messages from @ Sylas mention comments weren't being added to context
- Fixed issue where sub-issue base branches weren't being added to the user-prompt template, causing Sylas to create PRs against the default branch instead

### Packages

#### sylas-core
- sylas-core@0.0.8

#### sylas-claude-runner
- sylas-claude-runner@0.0.16

#### sylas-edge-worker
- sylas-edge-worker@0.0.21

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.15

#### sylas-ai (CLI)
- sylas-ai@0.1.38

## [0.1.37] - 2025-08-03

### Fixed
- Fixed "RateLimit exceeded" and `Cannot query field "agentContext" on type "AgentActivity".` errors when interacting with Linear API by updating SDK from v52 to v54
  - Linear API had breaking changes that caused compatibility issues with SDK v52
  - The outdated SDK was triggering excessive API calls leading to rate limit errors
  - Upgrading to v54 resolves these compatibility issues and restores normal operation

### Packages

#### sylas-core
- sylas-core@0.0.8

#### sylas-claude-runner
- sylas-claude-runner@0.0.15

#### sylas-edge-worker
- sylas-edge-worker@0.0.20

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.15

#### sylas-ai (CLI)
- sylas-ai@0.1.37

## [0.1.36] - 2025-08-01

### Added
- Instant response is now sent when receiving follow-up messages in an existing conversation, providing immediate feedback that Sylas is working on the request
  - Shows "I've queued up your message as guidance" when Sylas is still processing a previous request
  - Shows "Getting started on that..." when Sylas is ready to process the new request immediately
- Parent branch inheritance for sub-issues - sub-issue branches now automatically use their parent issue's branch as the base instead of the default repository branch
  - Maintains proper Git hierarchy matching Linear's issue structure
  - Gracefully falls back to default base branch if parent branch doesn't exist
  - Clear logging shows branch inheritance decisions
- Model notification at thread initialization - Sylas now announces which Claude model is being used (e.g., "Using model: claude-3-opus-20240229") when starting work on an issue
- Task tool execution markers in Linear comments - Sylas now clearly indicates when automated Task tools are running
  - Tools invoked within a Task display "↪ ToolName" to indicate they're part of the Task
  - Shows "✅ Task Completed" when the Task finishes and displays the output from the Task

### Packages

#### sylas-core
- sylas-core@0.0.7

#### sylas-claude-runner
- sylas-claude-runner@0.0.14

#### sylas-edge-worker
- sylas-edge-worker@0.0.19

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.14

#### sylas-ai (CLI)
- sylas-ai@0.1.36
## [0.1.35-alpha.0] - 2025-07-27

### Added
- Instant acknowledgment responses when Sylas receives a request, providing immediate feedback to users
- Role mode notifications when issue labels trigger specific workflows (e.g., "Entering 'debugger' mode because of the 'Bug' label")
- You can now append custom instructions to Claude's system prompt via `appendInstruction` in repository config (~/.sylas/config.json) - because sometimes Claude needs a gentle reminder that your variable names are art, not accidents

### Changed
- TodoWrite tool messages are now displayed as "thoughts" instead of "actions" in Linear for better visual organization

### Packages

#### sylas-core
- sylas-core@0.0.6-alpha.0

#### sylas-claude-runner
- sylas-claude-runner@0.0.13-alpha.0

#### sylas-edge-worker
- sylas-edge-worker@0.0.18-alpha.0

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.13-alpha.0

#### sylas-ai (CLI)
- sylas-ai@0.1.35-alpha.0

## [0.1.33] - 2025-07-11

### CLI
- sylas-ai@0.1.33

### Fixed
- Made conversation history of threads be resumable after Sylas restarts
- Fixed the issue with continuity of conversation in a thread, after the first comment

### Packages

#### sylas-core
- sylas-core@0.0.6

#### sylas-claude-runner
- sylas-claude-runner@0.0.13

#### sylas-edge-worker
- sylas-edge-worker@0.0.18

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.13

## [0.1.32] - 2025-07-09

### CLI
- sylas-ai@0.1.32

### Fixed
- Missing prompt template file in published package (the one thing you need to actually run the thing)

### Packages

#### sylas-edge-worker
- sylas-edge-worker@0.0.17
  - Fixed missing prompt-template-v2.md in package files

## [0.1.31] - 2025-07-09

### CLI
- sylas-ai@0.1.31

### Added
- Work on multiple tasks within a single Linear issue - each comment thread maintains its own Claude session, letting you tackle different parts of a problem in parallel without context mixing. New root comments start focused sessions that see the full conversation history in a threaded view (just like Linear's UI) while concentrating on your specific request
- Automatic ngrok tunnel setup for external access
  - No more manual port forwarding or reverse proxy setup required
  - Sylas will ask for your ngrok auth token on first run and handle the rest
  - Free ngrok account required (sorry, we can't make the internet work by magic alone)
  - Skip ngrok setup if you prefer to handle networking yourself
- Webhook debugging via `SYLAS_WEBHOOK_DEBUG=true` environment variable - see exactly what Linear is (or isn't) sending you

### Fixed
- Fresh startup no longer crashes with "EdgeWorker not initialized" error when trying to connect to Linear
- OAuth flow now works properly on first run (turns out asking for credentials before having a way to receive them was... problematic)
- Git worktrees now work with local-only repositories (no more "fatal: 'origin' does not appear to be a git repository" when you're just trying to test things locally)
- Webhooks now register with the correct URL (ngrok/public URL instead of localhost)

### Packages

#### sylas-edge-worker
- sylas-edge-worker@0.0.16
- Added ngrok tunnel support for automatic public URL generation
- Fixed webhook URL registration to use public URLs
- Added getPublicUrl() method to SharedApplicationServer

#### sylas-ndjson-client
- sylas-ndjson-client@0.0.12
- Fixed webhook URL registration to use external server's public URL when available

## [0.1.30] - 2025-07-07

### CLI
- sylas-ai@0.1.30

### Fixed
- Fixed critical crash issue where subprocess failures would bring down the entire application
  - Added global error handlers to prevent uncaught exceptions from terminating the process
  - Improved error isolation for individual Claude sessions - failures no longer affect other running sessions
  - Enhanced error logging with detailed stack traces for better debugging

### Packages

#### sylas-edge-worker
- sylas-edge-worker@0.0.15

## [0.1.28] - 2025-07-06

### CLI
- sylas-ai@0.1.28

### Fixed
- Fixed critical streaming hang where sessions would never complete
  - Auto-completes streaming prompt when Claude sends result message
  - Prevents infinite wait in for-await loop

## [0.1.27] - 2025-07-06

### CLI
- sylas-ai@0.1.27

### Changed
- Updated to use edge-worker 0.0.12 with fixed claude-runner dependency

## [0.1.26] - 2025-07-06

### CLI
- sylas-ai@0.1.26

### Fixed
- Fixed critical streaming hang issue where Claude Code would block waiting for messages
  - Corrected `abortController` placement in query options (was at wrong nesting level)
  - Fixed system prompt parameter name (now uses `customSystemPrompt` as expected by Claude Code)

### Added
- Added `appendSystemPrompt` option to ClaudeRunner config for extending default system prompt

## [0.1.25] - 2025-07-06

### CLI
- sylas-ai@0.1.25

### Fixed
- Fixed streaming session detection to prevent "I've queued up your message..." when sessions have completed
- Improved isStreaming() method to check both streaming state and session running status


## [0.1.23] - 2025-07-06

### CLI
- sylas-ai@0.1.23

### Fixed
- Fixed streaming input sessions not properly cleaning up after completion
  - Resolves issue where "I've queued up your message..." appeared even after sessions had resolved
  - Properly closes input streams when Claude sessions complete naturally

### Added
- Added `sylas check-tokens` command to validate all Linear OAuth tokens across repositories
- Added `sylas refresh-token` command with OAuth flow integration to renew expired tokens
- Improved error handling for expired Linear tokens with graceful degradation
  - Shows clear error messages with suggested resolution steps
  - Continues running with valid repositories when some tokens are expired

### Changed
- Configuration file location moved from `.edge-config.json` in current directory to `~/.sylas/config.json`
  - Automatically migrates existing `.edge-config.json` files to the new location
  - Uses standard user configuration directory for better cross-platform compatibility
  - Reports migration status when detected
- Default workspace directory changed from `{repository}/workspaces` to `~/.sylas/workspaces/{repo-name}`
  - Centralizes all sylas-related files in the user's home directory
  - Uses sanitized repository names as namespace folders
  - Existing configurations remain unchanged

## [0.1.22] - 2025-07-05

### CLI
- sylas-ai@0.1.22

### Added
- Automatic Linear MCP (Model Context Protocol) server integration
  - Claude can now use Linear API tools directly within sessions
  - Automatically configures `@tacticlaunch/mcp-linear` server with repository's Linear token
  - Adds 30+ Linear MCP tools for issue management, comments, projects, and more
  - No additional configuration needed - works out of the box with existing Linear tokens

### Changed
- ClaudeRunner now supports array of MCP config paths for composable configurations
- ClaudeRunner supports inline MCP server configurations alongside file-based configs
- MCP configurations from files and inline sources are merged together

### Fixed
- Fixed webhook signature verification failures after restarting sylas by extending edge worker registration TTL from 1 hour to 90 days
  - Resolves "Webhook signature verification failed for all registered handlers" error that occurred when sylas was stopped and restarted
  - Edge worker registrations in the proxy now persist for 90 days instead of expiring after 1 hour

### Improved
- New comments on Linear issues queue up when Sylas is already busy working, so that you can send multiple in a row ([#77](https://github.com/smilebank7/sylas/pull/77)) (now feed into existing Claude sessions instead of killing and restarting the session

### Packages

#### sylas-claude-runner
- sylas-claude-runner@0.0.8

#### sylas-edge-worker
- sylas-edge-worker@0.0.10

## [0.1.21] - 2025-07-05

### CLI
- sylas-ai@0.1.21

### Added
- Added `SYLAS_HOST_EXTERNAL` environment variable to enable external server access ([#78](https://github.com/smilebank7/sylas/pull/78))
  - Set to `true` to listen on `0.0.0.0` (all interfaces) instead of `localhost`
  - Enables Docker container deployment and external webhook access scenarios
  - Maintains backward compatibility with `localhost` as default

### Changed
- **BREAKING**: Renamed `SYLAS_WEBHOOK_BASE_URL` to `SYLAS_BASE_URL` for clearer naming
  - **Action Required**: Update environment configuration to use `SYLAS_BASE_URL` instead of `SYLAS_WEBHOOK_BASE_URL`
  - **Legacy Support**: `SYLAS_WEBHOOK_BASE_URL` is still supported for backward compatibility but deprecated
  - The variable serves both webhook and OAuth callback purposes since they run on the same server

### Packages

#### sylas-edge-worker
- sylas-edge-worker@0.0.9

## [0.1.19] - 2025-07-04

### CLI
- sylas-ai@0.1.19

### Added
- Added `SYLAS_OAUTH_CALLBACK_BASE_URL` environment variable to configure OAuth callback URL (defaults to `http://localhost:3457`) ([#69](https://github.com/smilebank7/sylas/pull/69))
- Added `SYLAS_OAUTH_CALLBACK_PORT` environment variable to configure OAuth callback port (defaults to `3457`)
- OAuth callback URL is now fully configurable for different deployment environments (Docker, remote development, custom domains)
- Supports `--env-file=path` option to load environment variables from custom file
- Added `SYLAS_BASE_URL` environment variable to configure base URL for edge workers ([#74](https://github.com/smilebank7/sylas/pull/74))
- Added `SYLAS_WEBHOOK_PORT` environment variable to configure webhook port (defaults to random port 3000-3999)
- Implemented shared webhook server architecture to eliminate port conflicts between multiple Linear tokens

### Changed
- **BREAKING**: Migrated from Server-Sent Events (SSE) to webhook-only architecture ([#74](https://github.com/smilebank7/sylas/pull/74))
  - **Action Required**: Edge workers now receive webhooks instead of SSE streams
  - **Action Required**: Set `SYLAS_BASE_URL` environment variable if using custom deployment URLs (e.g., ngrok tunnel, server domain)
  - **Action Required**: Set `SYLAS_WEBHOOK_PORT=3456` environment variable to ensure consistent webhook port
  - **Action Required**: Ensure edge workers can receive inbound HTTP requests on webhook ports
- Renamed repository setup script from `secretagentsetup.sh` to `sylas-setup.sh`

### Fixed
- Resolved SSE connection reliability issues by migrating to webhook architecture
- Improved disconnection message formatting
- Removed duplicate disconnection logging

### Packages

#### sylas-claude-runner
- Upgraded @anthropic-ai/claude-code dependency to version 1.0.31

## [0.0.3] - 2025-06-17

### Packages
- sylas-claude-runner@0.0.3
- sylas-core@0.0.3
- sylas-edge-worker@0.0.3
- sylas-ndjson-client@0.0.3

Initial changelog entry

## [0.1.9] - 2025-06-17

### CLI
- sylas-ai@0.1.9

Initial changelog entry
