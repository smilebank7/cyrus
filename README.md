# Sylas

[![CI](https://github.com/smilebank7/sylas/actions/workflows/ci.yml/badge.svg)](https://github.com/smilebank7/sylas/actions)

Self-hosted AI coding agent for [Linear](https://linear.app), powered by **oh-my series** multi-agent harnesses. A fork of [Cyrus](https://github.com/ceedaragents/cyrus) — reimagined with the most powerful open-source multi-agent orchestration available.

> **Bring your own keys.** Sylas requires your own API keys/billing for the AI providers you use.

---

## Why Sylas?

Cyrus gives you a solid issue-to-PR pipeline. Sylas takes that foundation and supercharges it with **oh-my series harnesses** — plugin systems that transform bare AI CLIs into full multi-agent orchestrators with the Sisyphus architecture.

Instead of one AI model working alone, Sylas deploys an **orchestrator (Sisyphus)** that delegates to specialized sub-agents, runs parallel exploration, consults high-IQ reasoning models, and self-verifies — all coordinated through a single Linear issue.

### Three Harnesses

| Harness | Runner | Plugin | Status |
|---------|--------|--------|--------|
| **OMO** | [OpenCode](https://github.com/sst/opencode) | [oh-my-opencode](https://github.com/nicepkg/oh-my-opencode) | **Default** — Most powerful |
| **OMC** | [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | [oh-my-claude](https://github.com/nicepkg/oh-my-claude) | Supported |
| **OMX** | [Codex CLI](https://github.com/openai/codex) | — | Supported |

**OMO** (OhMyOpencode) is the default and recommended harness. It combines OpenCode's tool-use capabilities with oh-my-opencode's Sisyphus/Opus multi-agent architecture for the deepest reasoning and most autonomous coding.

---

## How It Works

```
Linear Issue Assigned
        │
        ▼
  ┌─────────────┐
  │  EdgeWorker  │ ← Webhook received
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Git Worktree │ ← Isolated branch per issue
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  AI Runner   │ ← OMO / OMC / OMX
  │  (Sisyphus)  │   Multi-agent orchestration
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │   Linear    │ ← Real-time activity stream
  │  + GitHub   │   PR created, summary posted
  └─────────────┘
```

1. **Issue Detection**: Receives Linear webhooks when issues are assigned to Sylas
2. **Workspace Isolation**: Creates a dedicated Git worktree per issue (complete branch isolation)
3. **AI Classification**: Analyzes the issue to select the right workflow (code, question, research, release, etc.)
4. **Multi-Agent Processing**: Sisyphus orchestrates sub-agents — exploring code, implementing changes, running verifications
5. **Activity Streaming**: Every thought and action is posted back to Linear in real-time
6. **Session Continuity**: Add comments to an in-progress issue — they stream directly into the active AI session
7. **Delivery**: PR created, tests verified, summary posted to Linear

---

## Features

- **Multi-Agent Orchestration** — Sisyphus delegates to specialized sub-agents (explore, librarian, oracle) for parallel research and implementation
- **Session Continuity** — Resume existing sessions when new comments are added; mid-implementation prompting via Linear comments
- **Full-Delegation Mode** — Single session, no subroutine splitting — let Sisyphus handle the entire workflow autonomously
- **Issue Update Awareness** — Edit the issue description while the agent is working — it detects changes and adjusts course
- **Interactive Clarification** — Agent asks you questions via Linear when it needs decisions (dropdown selects)
- **Cross-Repository Orchestration** — Orchestrator issues can spawn sub-issues across different repositories
- **GitHub PR Triggers** — `@sylasagent` mentions on GitHub PRs create sessions and post replies
- **Acceptance Criteria Validation** — Verifies implementation against issue acceptance criteria before PR creation
- **Validation Loop** — Automatic retry on verification failures (up to 4 attempts)
- **Graphite Stacked PRs** — Native support for Graphite CLI stacked PR workflows
- **Custom Skills** — Extend Sylas with your own `.claude/skills/` SKILL.md files

---

## Quick Start

### CLI Installation

```bash
# Install globally
npm install -g sylas-ai

# Authenticate with Linear
sylas auth

# Start the agent
sylas start
```

For Sylas to create pull requests, configure Git and GitHub CLI. See **[Git & GitHub Setup](./docs/GIT_GITHUB.md)**.

Keep Sylas running as a persistent process:

- **tmux**: `tmux new -s sylas` then run `sylas start` (Ctrl+B, D to detach)
- **pm2**: `pm2 start sylas --name sylas`
- **systemd**: See [Running as a Service](./docs/SELF_HOSTING.md#running-as-a-service)

### Docker

```bash
# Clone and configure
git clone https://github.com/smilebank7/sylas.git
cd sylas/deploy

# Copy and edit environment configuration
cp .env.example .env
# Edit .env with your Linear token, API keys, etc.

# Start
docker-compose up -d
```

See [`deploy/`](./deploy/) for Docker Compose, Dockerfile, and environment configuration.

---

## Architecture

pnpm monorepo with edge-worker architecture:

```
sylas/
├── apps/
│   ├── cli/                     # Main CLI application (sylas-ai on npm)
│   └── proxy/                   # OAuth proxy server
│
├── packages/
│   ├── edge-worker/             # Core: webhook handling, session management, prompt assembly
│   ├── opencode-runner/         # OMO — OpenCode + oh-my-opencode harness (default)
│   ├── claude-runner/           # OMC — Claude Code + oh-my-claude harness
│   ├── codex-runner/            # OMX — Codex CLI harness
│   ├── core/                    # Shared types, session management, logging
│   ├── linear-event-transport/  # Linear webhook receiver
│   ├── github-event-transport/  # GitHub webhook receiver
│   ├── mcp-tools/               # Built-in MCP tools (Linear, image gen, etc.)
│   ├── config-updater/          # Dynamic config reload
│   └── cloudflare-tunnel-client/# Cloudflare tunnel transport
│
├── deploy/                      # Docker, Dockerfile, environment config
├── docs/                        # Self-hosting, config, tunnel guides
└── skills/                      # Shared agent skills (F1 test drives, etc.)
```

---

## Runner Selection

Select which runner processes an issue via Linear labels or issue description tags:

```
# Labels (apply to Linear issue)
omo, opencode          → OMO (OpenCode + oh-my-opencode)
omc, claude, opus      → OMC (Claude Code + oh-my-claude)
omx, codex             → OMX (Codex CLI)

# Description tags (add to issue description)
[agent=opencode]       → OMO
[agent=claude]         → OMC
[agent=codex]          → OMX
[model=claude-opus-4]  → OMC with specific model
```

If no runner is specified, Sylas defaults to **OMO**.

---

## Documentation

- **[Self-Hosting Guide](./docs/SELF_HOSTING.md)** — Complete self-hosted setup
- **[Configuration Reference](./docs/CONFIG_FILE.md)** — Detailed config.json options
- **[Git & GitHub Setup](./docs/GIT_GITHUB.md)** — Git and GitHub CLI configuration for PRs
- **[Cloudflare Tunnel Setup](./docs/CLOUDFLARE_TUNNEL.md)** — Expose your local instance
- **[Setup Scripts](./docs/SETUP_SCRIPTS.md)** — Repository and global initialization scripts

---

## Roadmap

Sylas v2 is under active development:

- **v2.0** — Runner Consolidation (rename to omo-runner / omc-runner / omx-runner)
- **v2.1** — Dead Code Removal (remove unused Gemini, Cursor, SimpleAgent runners)
- **v2.2** — Dashboard MVP (React + Vite web dashboard for config, monitoring, sessions)
- **v2.3** — Deployment Modes (CLI auto-serve dashboard, Docker persistent state)
- **v2.4** — AI Account Connection (OAuth flows for Claude, Codex from dashboard)
- **v2.5** — Documentation & Branding
- **v2.6** — Code Review Mode

Track progress on [Linear](https://linear.app/leejhin/project/sylasleejhin-462a8de156ce).

---

## Upstream

Sylas is a fork of [Cyrus](https://github.com/ceedaragents/cyrus) by [Ceedar Agents](https://github.com/ceedaragents). We maintain an [upstream sync pipeline](https://github.com/smilebank7/sylas) to pull in Cyrus improvements while layering on oh-my series harness capabilities.

**Key differences from Cyrus:**
- **oh-my series harnesses** — Multi-agent orchestration via Sisyphus architecture (not just single-model execution)
- **OMO as default** — OpenCode + oh-my-opencode is the primary runner (Cyrus defaults to Claude Code)
- **Full-delegation mode** — Single session autonomy without subroutine splitting
- **Fully self-hosted** — No dependency on a commercial dashboard
- **Linear-first** — Deep Linear integration as primary platform

---

## License

[MIT](LICENSE)

## Credits

Built on the shoulders of:

- [Cyrus](https://github.com/ceedaragents/cyrus) by Ceedar Agents — the foundation
- [OpenCode](https://github.com/sst/opencode) by SST — AI coding CLI
- [oh-my-opencode](https://github.com/nicepkg/oh-my-opencode) / [oh-my-claude](https://github.com/nicepkg/oh-my-claude) — Multi-agent orchestration plugins
- [Linear API](https://linear.app/developers) — Issue tracking
- [Anthropic Claude](https://www.anthropic.com/claude) — AI models
