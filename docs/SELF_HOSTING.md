# End-to-End Self-Hosting Guide

This guide walks you through setting up Sylas completely self-hosted, including your own Linear OAuth application. This is the free, zero-cost option that gives you full control.

> **Tip:** If you're using Claude, Cursor, or any AI coding agent, ask it to read this file and help you implement all the steps. Example: *"Read docs/SELF_HOSTING.md and help me set up self-hosted Sylas"*

---

## Prerequisites

- **Linear workspace** with admin access (required to create OAuth apps)
- **Node.js** v18 or higher
- **jq** (for Claude Code parsing)
- **A public URL** for receiving Linear webhooks

### Install Dependencies

**macOS:**
```bash
brew install jq gh

# Verify
jq --version      # Should show version like jq-1.7
node --version    # Should show v18 or higher
```

**Linux/Ubuntu:**
```bash
apt install -y gh npm git jq

# Verify
jq --version      # Should show version like jq-1.7
node --version    # Should show v18 or higher
```

---

## Overview

You'll complete these steps:

1. Set up a public URL for webhooks
2. Configure Claude Code authentication
3. Create a Linear OAuth application
4. Install Sylas and complete your environment file
5. Start Sylas, authorize with Linear, and add repositories

> **Tip:** Sylas automatically loads environment variables from `~/.sylas/.env` on startup. You can override this path with `sylas --env-file=/path/to/your/env`.

---

## Step 1: Set Up Public URL

Linear needs to send webhooks to your Sylas instance. Choose one option:

| Option | Best For | Persistence |
|--------|----------|-------------|
| [Cloudflare Tunnel](./CLOUDFLARE_TUNNEL.md) | Production | Permanent URL |
| ngrok | Development/testing | Changes on restart |
| Public server/domain | VPS or cloud hosting | Permanent URL |
| Reverse proxy (nginx/caddy) | Existing infrastructure | Permanent URL |

You'll need:
- A public URL (e.g., `https://sylas.yourdomain.com`)
- The URL must be accessible from the internet

---

## Step 2: Configure AI Runner Authentication

Sylas uses OpenCode with the oh-my-opencode plugin for multi-agent orchestration.

### Native CLI (this guide)

Run `opencode auth login` on the host machine and follow the browser OAuth flow. Auth tokens are stored in `~/.local/share/opencode/auth.json`.

### Docker Hybrid (recommended for servers)

Auth is managed on the **host** and bind-mounted into the container. See `deploy/` directory:

```bash
# One-time setup on server
cd /opt/sylas
sudo ./scripts/auth-bootstrap.sh

# Starts interactive prompts for:
# 1. Anthropic OAuth token (from opencode auth login on local machine)
# 2. GitHub personal access token
# 3. GitHub CLI auth
```

The container fails fast if `state/opencode/auth.json` is missing — no silent fallback.

---

## Step 3: Create Linear OAuth Application

**IMPORTANT:** You must be a **workspace admin** in Linear.

### 3.1 Open Linear Settings

1. Go to Linear: https://linear.app
2. Click your workspace name (top-left corner)
3. Click **Settings** in the dropdown
4. In the left sidebar, scroll down to **Account** section
5. Click **API**
6. Scroll down to **OAuth Applications** section

### 3.2 Create New Application

1. Click **Create new OAuth Application** button

2. Fill in the form:
   - **Name:** `Sylas`
   - **Description:** `Self-hosted Sylas agent for automated development`
   - **Callback URLs:** `https://your-public-url.com/callback`

3. **Enable Client credentials** toggle

4. **Enable Webhooks** toggle

5. **Configure Webhook Settings:**
   - **Webhook URL:** `https://your-public-url.com/webhook`
   - **App events** - Check these boxes:
     - **Agent session events** (REQUIRED - makes Sylas appear as agent)
     - **Inbox notifications** (recommended)
     - **Permission changes** (recommended)

6. Click **Save**

### 3.3 Copy OAuth Credentials

After saving, copy these values:

1. **Client ID** - Long string like `client_id_27653g3h4y4ght3g4`
2. **Client Secret** - Another long string (may only be shown once!)
3. **Webhook Signing Secret** - Found in webhook settings

### 3.4 Add to Environment File

Add these to your env file (`~/.sylas/.env`):

```bash
# Linear OAuth configuration
LINEAR_DIRECT_WEBHOOKS=true
LINEAR_CLIENT_ID=client_id_27653g3h4y4ght3g4
LINEAR_CLIENT_SECRET=client_secret_shgd5a6jdk86823h
LINEAR_WEBHOOK_SECRET=lin_whs_s56dlmfhg72038474nmfojhsn7
```

---

## Step 4: Install and Configure Sylas

### 4.1 Install Sylas

```bash
npm install -g sylas-ai
```

### 4.2 Complete Your Environment File

Your env file (`~/.sylas/.env`) should now contain:

```bash
# Server configuration
LINEAR_DIRECT_WEBHOOKS=true
SYLAS_BASE_URL=https://your-public-url.com
SYLAS_SERVER_PORT=3456

# Linear OAuth
LINEAR_CLIENT_ID=your_client_id
LINEAR_CLIENT_SECRET=your_client_secret
LINEAR_WEBHOOK_SECRET=your_webhook_secret

# GitHub (fallback — prefer bind mount via auth-bootstrap.sh)
GITHUB_TOKEN=your-github-token
GH_TOKEN=your-github-token
```

---

## Step 5: Authorize and Add Repositories

### 5.1 Authorize with Linear

```bash
sylas self-auth
```

This will:
1. Start a temporary OAuth callback server
2. Open your browser to Linear's OAuth authorization page
3. After you click **Authorize**, redirect back and save the tokens to your config

### 5.2 Add a Repository

```bash
sylas self-add-repo https://github.com/yourorg/yourrepo.git
```

This clones the repository to `~/.sylas/repos/` and configures it with your Linear workspace credentials.

For multiple workspaces, specify which one:
```bash
sylas self-add-repo https://github.com/yourorg/yourrepo.git "My Workspace"
```

You can run `sylas self-add-repo` at any time, even while Sylas is running. No restart is required—Sylas will automatically pick up the new repository configuration.

### 5.3 Start Sylas

Once authorization is complete and repositories are added, start Sylas:

```bash
sylas
```

Sylas automatically loads `~/.sylas/.env` on startup. You'll see Sylas start up and show logs.

> **Note:** To use a different env file location, use `sylas --env-file=/path/to/your/env`.

---

## Step 6: Set Up GitHub (Optional)

For Sylas to create pull requests, configure Git and GitHub CLI authentication.

See the **[Git & GitHub Setup Guide](./GIT_GITHUB.md)** for complete instructions.

---

## Running as a Service

For 24/7 availability, run Sylas as a persistent process.

### Using tmux

```bash
tmux new-session -s sylas
sylas
# Ctrl+B, D to detach
# tmux attach -t sylas to reattach
```

### Using pm2

```bash
pm2 start sylas --name sylas
pm2 save
pm2 startup
```

### Using systemd (Linux)

Create `/etc/systemd/system/sylas.service`:

```ini
[Unit]
Description=Sylas AI Agent
After=network.target

[Service]
Type=simple
User=your-user
EnvironmentFile=/home/your-user/.sylas/.env
ExecStart=/usr/local/bin/sylas
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable sylas
sudo systemctl start sylas
```

---

## Configuration

Sylas stores its configuration in `~/.sylas/config.json`. You can customize tool permissions, issue routing rules, MCP server integrations, and label-based AI modes by editing this file. Sylas watches the config file and automatically picks up changes—no restart required.

For detailed options, see the [Configuration File Reference](./CONFIG_FILE.md).

---

## Troubleshooting

### OAuth Authorization Fails

- Verify `SYLAS_BASE_URL` matches your Linear OAuth callback URL exactly
- Check that your public URL is accessible from the internet
- Ensure all Linear environment variables are set

### Webhooks Not Received

- Verify Linear webhook URL matches `SYLAS_BASE_URL/webhook`
- Check Sylas logs for incoming webhook attempts
- Ensure your public URL is accessible

### Repository Not Processing

- Check that the repository is in your config (`~/.sylas/config.json`)
- Verify Linear tokens are valid with `sylas check-tokens`
- Ensure the issue is assigned to Sylas in Linear

### OpenCode Not Working

- Check `~/.local/share/opencode/auth.json` exists (native) or `state/opencode/auth.json` (Docker)
- Re-run `opencode auth login` on a machine with a browser to refresh tokens
- For Docker: re-run `scripts/auth-bootstrap.sh` on the host

---

## Development Mode

If you're developing Sylas from source:

```bash
cd /path/to/sylas
pnpm install

cd apps/cli
pnpm link --global

# In a separate terminal
pnpm dev

# Then run sylas normally
sylas
```
