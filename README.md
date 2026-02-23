# Sylas

Self-hosted AI coding agent for [Linear](https://linear.app). Monitors Linear issues assigned to it, creates isolated Git worktrees, runs [OpenCode](https://github.com/sst/opencode) sessions with [oh-my-opencode](https://github.com/nicepkg/oh-my-opencode) multi-agent orchestration, and streams detailed activity updates back to Linear.

## Overview

Sylas is a fork of [Cyrus](https://github.com/ceedaragents/cyrus) — reimagined to use **OpenCode** as the AI runner instead of Claude Code CLI, with full multi-agent support via the oh-my-opencode plugin (Sisyphus/Opus architecture).

### How It Works

1. **Issue Detection**: Receives Linear webhooks when issues are assigned
2. **Workspace Isolation**: Creates a dedicated Git worktree per issue
3. **AI Processing**: Runs OpenCode sessions with oh-my-opencode for multi-agent orchestration
4. **Activity Streaming**: Posts real-time thoughts and actions back to Linear
5. **Session Continuity**: Resumes existing sessions when new comments are added

## Deployment

Deployed via Docker with Traefik reverse proxy on `sylas.leejh.in`.

```bash
# Push to main triggers auto-deploy via GitHub Actions
git push origin main
# → Self-hosted runner builds GHCR image → SSH deploy to server
```

See [`deploy/`](./deploy/) for Docker Compose, Dockerfile, and environment configuration.

## Architecture

pnpm monorepo with edge-proxy architecture:

```
packages/
├── edge-worker/       # Core: webhook handling, session management, prompt assembly
├── opencode-runner/   # OpenCode CLI execution wrapper
├── core/              # Shared types and session management
└── ...                # Other runner packages (claude, codex, gemini, cursor)
```

## License

[MIT](LICENSE)
