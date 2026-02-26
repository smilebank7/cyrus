# Internal Changelog

This changelog documents internal development changes, refactors, tooling updates, and other non-user-facing modifications.

## [Unreleased]
## [0.2.23] - 2026-02-26

### CLI Unified Onboarding (LJH-113)
 Added `OnboardingService` with interactive prompts for first-run setup (Linear auth, repository config, environment variables). `StartCommand` triggers onboarding when `repositories.length === 0`. ([#7](https://github.com/smilebank7/sylas/pull/7))
 Fixed first-run gate to check `repositories.length === 0` only (not config existence). Fixed `.env` merge logic to preserve existing values with `dotenv.parse()`. ([#7](https://github.com/smilebank7/sylas/pull/7))

### Procedure System Removal (LJH-112)
 Removed `ProcedureAnalyzer`, `SubroutineAdvancer`, all subroutine prompt files, procedure-specific test files, and related EdgeWorker/AgentSessionManager logic. Only `full-delegation.md` prompt retained. (-8,609 lines) ([#7](https://github.com/smilebank7/sylas/pull/7))

### Runner Consolidation (LJH-82/83/84)
 Narrowed `RunnerKind` type to `"opencode" | "claude"`. All disabled runner code (gemini, cursor, codex) marked with `// TEMPORARILY DISABLED: runner consolidation v2` markers. ([#7](https://github.com/smilebank7/sylas/pull/7))
 Updated `RunnerSelectionService`, `EdgeWorker`, `AgentSessionManager`, `ChatSessionHandler` to remove disabled runner logic.
 Deprecated gemini/codex model fields in `config-schemas.ts` and `config-types.ts`. Deprecated disabled runner session fields in `SylasAgentSession` and `PersistenceManager`.
 Updated runner-selection tests: disabled runner labels now assert fallback to `opencode`.
## [0.2.22] - 2026-02-26

### Runner Pipeline & CLI Fixes
- Runner packages (opencode-runner, codex-runner, cursor-runner, gemini-runner, simple-agent-runner) moved to optional peerDependencies on edge-worker, loaded dynamically via `RunnerRegistry.ts`. Type shims added in `optional-runner-shims.d.ts`. ([#5](https://github.com/smilebank7/sylas/pull/5))
- Replaced `open` npm package with native `child_process.exec` utility (`apps/cli/src/utils/openUrl.ts`) using platform-native commands (`open` on macOS, `xdg-open` on Linux) to fix bunx ESM resolution failure with `define-lazy-prop`. ([#6](https://github.com/smilebank7/sylas/pull/6))
- Fixed CLI tsconfig `include` from `["*.ts", "src/**/*.ts"]` to `["src/**/*.ts"]` to prevent root-level files (vitest.config.ts) from compiling into `dist/`, eliminating the `dist/src/` nested output problem. Updated `bin`, `main`, `types`, `start` script, and `app.ts` package.json resolution path accordingly. ([#6](https://github.com/smilebank7/sylas/pull/6))

### Bun Migration (LJH-106)
 Migrated package manager from pnpm to Bun across the entire monorepo. Removed `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and `packageManager` field; added `workspaces` and `overrides` to root `package.json`; generated `bun.lock`. ([LJH-106](https://linear.app/leejhin/issue/LJH-106/), [#4](https://github.com/smilebank7/sylas/pull/4))
 Migrated test runner from vitest to bun:test across all 83 test files in 16 packages. Converted `vi.fn()` → `mock()`, `vi.spyOn()` → `spyOn()`, `vi.mock()` → `mock.module()`, timer APIs, and all vitest-specific patterns. Deleted all 10 `vitest.config.ts` files; added `packages/edge-worker/bunfig.toml` with test preload.
 Removed vitest devDependencies (`vitest`, `@vitest/coverage-v8`) from all 16 package.json files.
 Rewrote `.github/workflows/ci.yml` to use `oven-sh/setup-bun@v2` with per-file test execution to work around bun 1.3.x `mock.module()` cross-file contamination. Added concurrency group for branch-level dedup.
 Added `.github/workflows/lint-workflows.yml` for actionlint CI workflow YAML validation.
 Rewrote `.github/actions/install-dependencies/action.yml` for bun.
 Updated `deploy/Dockerfile` to `FROM oven/bun:1-debian`, removed pnpm/corepack setup.
 Updated `.husky/pre-commit` to use `bun run typecheck`.
 Updated all package scripts from `pnpm` → `bun run` and `vitest` → `bun test`.

### v2 Migration Planning
 Established v2 roadmap: 6 milestones (v2.0–v2.5) + v2.6 (code review) registered in Linear project `sylas.leejh.in`
 Archived legacy Phase 1–5 milestones, renamed Phase 4 → v2.6
 Created 27 issues across all milestones for runner consolidation (OMO/OMC/OMX), dead code removal (Gemini/Cursor/SimpleAgent/Slack), dashboard MVP, deployment modes, AI account connection, and documentation
 README.md rewritten: Cyrus fork + oh-my series multi-agent harnesses branding, architecture diagram, runner selection guide, v2 roadmap
 AGENTS.md updated: three-harness architecture table (OMO/OMC/OMX), deprecated Gemini/Cursor sections, updated Architecture Overview with current packages, updated Key Code Paths with all 3 runners
 CHANGELOG.md and CHANGELOG.internal.md updated with v2 documentation entries

### Changed
- `SlackEventTransport.getSlackBotToken()` now reads `SLACK_BOT_TOKEN` exclusively from `process.env` with no header fallback. The `X-Slack-Bot-Token` request header is no longer used. ([CYPACK-824](https://linear.app/ceedar/issue/CYPACK-824), [#876](https://github.com/smilebank7/sylas/pull/876))
- Refactored `EdgeWorker.ts` by extracting 5 service modules: `ActivityPoster` (Linear activity posting), `AttachmentService` (attachment download/manifests), `ConfigManager` (config file watching/reload/change detection), `PromptBuilder` (prompt assembly/system prompts/issue context), and `RunnerSelectionService` (runner/model selection/tool configuration). Reduced EdgeWorker from 7,687 to 5,466 lines (29% reduction) while maintaining full test coverage (522 tests). ([CYPACK-822](https://linear.app/ceedar/issue/CYPACK-822), [#874](https://github.com/smilebank7/sylas/pull/874))
- Merged `main` into `cypack-807` branch, resolving 7 merge conflicts and fixing auto-merge issues across AgentSessionManager, EdgeWorker, GitService, ProcedureAnalyzer, gemini-runner, and changelogs. Updated 2 test files from `IIssueTrackerService` to `IActivitySink` interface. ([CYPACK-821](https://linear.app/ceedar/issue/CYPACK-821), [#873](https://github.com/smilebank7/sylas/pull/873))
- Decoupled Slack webhook handler from `RepositoryConfig`: introduced `NoopActivitySink` for non-repository sessions, dedicated `slackSessionManager` on `EdgeWorker`, and `slackThreadSessions` map for thread-based session reuse. `createSlackWorkspace` now creates plain directories under `~/.sylas/slack-workspaces/` instead of git worktrees. Runner config is built inline (bypassing `buildAgentRunnerConfig` which requires a repository). Added `SlackReactionService` to `sylas-slack-event-transport` package. ([CYPACK-815](https://linear.app/ceedar/issue/CYPACK-815), [#868](https://github.com/smilebank7/sylas/pull/868))
- Refactored logging across all packages to use a dedicated `ILogger` interface and `Logger` implementation in `packages/core/src/logging/`. Replaced direct `console.log`/`console.error` calls in EdgeWorker, AgentSessionManager, ClaudeRunner, GitService, RepositoryRouter, SharedApplicationServer, SharedWebhookServer, WorktreeIncludeService, ProcedureAnalyzer, AskUserQuestionHandler, LinearEventTransport, and LinearIssueTrackerService with structured logger calls. Log level is configurable via the `SYLAS_LOG_LEVEL` environment variable (DEBUG, INFO, WARN, ERROR, SILENT).
- Added source context (session ID, platform, issue identifier, repository) to log messages via `logger.withContext()`, enabling easier debugging and log filtering across concurrent sessions
- Updated `SylasAgentSession` schema to v3.0: renamed `linearAgentActivitySessionId` to `id`, added optional `externalSessionId` for tracker-specific IDs, added optional `issueContext` object for issue metadata, made `issue` and `issueId` optional to support standalone sessions ([CYPACK-728](https://linear.app/ceedar/issue/CYPACK-728), [#770](https://github.com/smilebank7/sylas/pull/770))
- Updated `PersistenceManager` to v3.0 format with automatic migration from v2.0, preserving all existing session data during migration ([CYPACK-728](https://linear.app/ceedar/issue/CYPACK-728), [#770](https://github.com/smilebank7/sylas/pull/770))
- GitHub webhook handling now uses forwarded installation tokens: `GitHubEventTransport` extracts `X-GitHub-Installation-Token` header from CYHOST webhooks and includes it in emitted events, `EdgeWorker.postGitHubReply()` and `EdgeWorker.fetchPRBranchRef()` prefer the forwarded token over `process.env.GITHUB_TOKEN`, enabling self-hosted Sylas instances to post PR comment replies and fetch PR branch details using short-lived (1-hour) GitHub App installation tokens ([CYPACK-773](https://linear.app/ceedar/issue/CYPACK-773), [#821](https://github.com/smilebank7/sylas/pull/821), [CYPACK-774](https://linear.app/ceedar/issue/CYPACK-774), [#822](https://github.com/smilebank7/sylas/pull/822))

### Added
- New `sylas-slack-event-transport` package: EventEmitter-based transport for receiving and verifying forwarded Slack webhooks from CYHOST, with proxy (Bearer token) verification mode. Includes `SlackMessageTranslator` for translating `app_mention` events into unified `SessionStartMessage` and `UserPromptMessage` types, thread-aware session key generation (`channel:thread_ts`), `@mention` stripping, and Slack Bot token forwarding via `X-Slack-Bot-Token` header. Added `SlackSessionStartPlatformData`, `SlackUserPromptPlatformData`, and corresponding type guards to `sylas-core`. ([CYPACK-807](https://linear.app/ceedar/issue/CYPACK-807), [#861](https://github.com/smilebank7/sylas/pull/861))
- New `sylas-github-event-transport` package: EventEmitter-based transport for receiving and verifying forwarded GitHub webhooks, with proxy (Bearer token) and signature (HMAC-SHA256) verification modes, a `GitHubCommentService` for posting replies via GitHub REST API, and utility functions for extracting webhook payload data. ([CYPACK-772](https://linear.app/ceedar/issue/CYPACK-772), [#820](https://github.com/smilebank7/sylas/pull/820))
- EdgeWorker GitHub webhook integration: `/github-webhook` endpoint, session creation flow for PR comments, git worktree checkout for PR branches, and reply posting via GitHub API. ([CYPACK-772](https://linear.app/ceedar/issue/CYPACK-772), [#820](https://github.com/smilebank7/sylas/pull/820))
- Subroutine result text is now stored in procedure history when advancing between subroutines. On error results (e.g. `error_max_turns` from single-turn subroutines), `AgentSessionManager` recovers by using the last completed subroutine's result via `ProcedureAnalyzer.getLastSubroutineResult()`, allowing the procedure to continue to completion instead of failing
- Created `GlobalSessionRegistry` class for centralized session storage across all repositories, enabling cross-repository session lookups in orchestrator workflows ([CYPACK-725](https://linear.app/ceedar/issue/CYPACK-725), [#766](https://github.com/smilebank7/sylas/pull/766))
- Extracted `IActivitySink` interface and `LinearActivitySink` implementation to decouple activity posting from `IIssueTrackerService`, enabling multiple activity sinks to receive session activities ([CYPACK-726](https://linear.app/ceedar/issue/CYPACK-726), [#767](https://github.com/smilebank7/sylas/pull/767))
- Integrated `GlobalSessionRegistry` with `EdgeWorker`, making it the single source of truth for parent-child session mappings and cross-repository session lookups ([CYPACK-727](https://linear.app/ceedar/issue/CYPACK-727), [#769](https://github.com/smilebank7/sylas/pull/769))
- Added Cursor harness `[agent=cursor]`, including offline F1 drives for stop/tool activity, resume continuation, and permission synchronization behavior. Also added project-level Cursor CLI permissions mapping from Sylas tool permissions (including subroutine-time updates), pre-run MCP server enablement (`agent mcp list` + `agent mcp enable <server>`), switched the default Codex runner model to `gpt-5.3-codex`, and aligned edge-worker Vitest module resolution to use local `sylas-claude-runner` sources during tests. ([CYPACK-804](https://linear.app/ceedar/issue/CYPACK-804), [#858](https://github.com/smilebank7/sylas/pull/858))
- Added Fastify MCP transport for `sylas-tools` on the shared application server endpoint, replacing inline SDK-only wiring with HTTP MCP configuration and per-session context headers, and now enforcing `Authorization: Bearer <SYLAS_API_KEY>` on `/mcp/sylas-tools` requests. Also fixed Codex MCP server config mapping so `headers` are translated to Codex `http_headers` (while preserving `http_headers`, `env_http_headers`, and `bearer_token_env_var`) for authenticated HTTP MCP initialization. Includes F1 validation covering `initialize` and `tools/list` on `/mcp/sylas-tools`. ([CYPACK-817](https://linear.app/ceedar/issue/CYPACK-817), [#870](https://github.com/smilebank7/sylas/pull/870))

### Fixed
- Updated orchestrator system prompts to explicitly require `state: "To Do"` when creating issues via `mcp__linear__create_issue`, preventing issues from being created in "Triage" status. ([CYPACK-761](https://linear.app/ceedar/issue/CYPACK-761), [#815](https://github.com/smilebank7/sylas/pull/815))

## [0.2.21] - 2026-02-09

### Changed
- Refactored formatting strategy from TodoWrite to Task tools (TaskCreate, TaskUpdate, TaskList, TaskGet). Added `formatTaskParameter()` method to IMessageFormatter interface and updated AgentSessionManager to handle Task tools as thought activities. ([CYPACK-788](https://linear.app/ceedar/issue/CYPACK-788), [#837](https://github.com/smilebank7/sylas/pull/837))
- Redesigned TaskCreate formatting for parallel execution (concise `⏳ **subject**` checklist items), improved TaskUpdate/TaskGet to show subject names with status emojis, added ToolSearch formatting (`🔍 Loading`/`🔍 Searching tools`) rendered as non-ephemeral thought in AgentSessionManager, and added TaskOutput formatting (`📤 Waiting for`/`📤 Checking`). Updated both ClaudeMessageFormatter and GeminiMessageFormatter with matching logic. ([CYPACK-795](https://linear.app/ceedar/issue/CYPACK-795), [#846](https://github.com/smilebank7/sylas/pull/846))
- Deferred TaskUpdate/TaskGet activity posting from tool_use time to tool_result time to enrich with task subject. Added `taskSubjectsByToolUseId` and `taskSubjectsById` caches to AgentSessionManager for subject resolution from TaskCreate results and TaskGet result parsing. ([CYPACK-797](https://linear.app/ceedar/issue/CYPACK-797), [#847](https://github.com/smilebank7/sylas/pull/847))

### Added
- Subroutine result text is now stored in procedure history when advancing between subroutines. On error results (e.g. `error_max_turns` from single-turn subroutines), `AgentSessionManager` recovers by using the last completed subroutine's result via `ProcedureAnalyzer.getLastSubroutineResult()`, allowing the procedure to continue to completion instead of failing. Added `disallowAllTools` parameter to `buildAgentRunnerConfig` and `tools` config pass-through to `ClaudeRunner` for properly disabling built-in tools. ([CYPACK-792](https://linear.app/ceedar/issue/CYPACK-792), [#843](https://github.com/smilebank7/sylas/pull/843))

## [0.2.20] - 2026-02-05

(No internal changes in this release)

## [0.2.19] - 2026-01-24

### Fixed
- Fixed labelPrompts schema to accept both simple array form (`{ debugger: ["Bug"] }`) and complex object form (`{ debugger: { labels: ["Bug"], allowedTools?: ... } }`). This resolves type mismatches when sylas-hosted sends simplified configurations. ([#802](https://github.com/smilebank7/sylas/pull/802))

## [0.2.18] - 2026-01-23

### Changed
- Replaced manual TypeScript interfaces with Zod schemas as the source of truth for `EdgeConfig`, `RepositoryConfig`, and related configuration types. This ensures type safety at both compile-time and runtime, and fixes type drift where `SylasConfigPayload` was missing fields like `issueUpdateTrigger`. ([#800](https://github.com/smilebank7/sylas/pull/800))

## [0.2.17] - 2026-01-23

(No internal changes in this release)

## [0.2.16] - 2026-01-23

(No internal changes in this release)

## [0.2.15] - 2026-01-16

(No internal changes in this release)

## [0.2.14] - 2026-01-16

(No internal changes in this release)

## [0.2.13] - 2026-01-15

(No internal changes in this release)

## [0.2.12] - 2026-01-09

(No internal changes in this release)

## [0.2.11] - 2026-01-07

(No internal changes in this release)

## [0.2.10] - 2026-01-06

(No internal changes in this release)

## [0.2.9] - 2025-12-30

(No internal changes in this release)

## [0.2.8] - 2025-12-28

(No internal changes in this release)

## [0.2.7] - 2025-12-28

### Changed
- Moved publishing docs from CLAUDE.md to `/release` skill for cleaner documentation and easier invocation ([CYPACK-667](https://linear.app/ceedar/issue/CYPACK-667), [#705](https://github.com/smilebank7/sylas/pull/705))

## [0.2.6] - 2025-12-22

### Fixed
- Fixed the CLI issue tracker's `labels()` method to return actual label data instead of an empty array, enabling correct runner selection (Codex/Gemini) in F1 tests ([CYPACK-547](https://linear.app/ceedar/issue/CYPACK-547), [#624](https://github.com/smilebank7/sylas/pull/624))
