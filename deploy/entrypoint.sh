#!/bin/sh
set -e

OPENCODE_DATA="/root/.local/share/opencode"
OPENCODE_CONFIG="/root/.config/opencode"

fail() { echo "FATAL: $1" >&2; exit 1; }

# --- Fail-fast: required host-mounted auth -----------------------------------

if [ ! -f "$OPENCODE_DATA/auth.json" ]; then
  fail "OpenCode auth.json not found at $OPENCODE_DATA/auth.json
Run scripts/auth-bootstrap.sh on the HOST first, then restart the container."
fi

# --- Git credentials (from host bind mount) ----------------------------------

if [ -f /root/.git-credentials-host ] && [ -s /root/.git-credentials-host ]; then
  git config --global credential.helper store
  cp /root/.git-credentials-host /root/.git-credentials
  chmod 600 /root/.git-credentials
  echo "Git credentials loaded from host bind mount"
elif [ -n "$GITHUB_TOKEN" ]; then
  git config --global credential.helper store
  echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > /root/.git-credentials
  echo "Git credentials configured from GITHUB_TOKEN env"
else
  echo "WARN: No git credentials found (no bind mount, no GITHUB_TOKEN)"
fi

# --- OpenCode config (oh-my-opencode plugin) ---------------------------------

mkdir -p "$OPENCODE_CONFIG"
cat > "$OPENCODE_CONFIG/opencode.json" << 'OCJSON'
{
  "plugin": ["file:///usr/local/lib/node_modules/oh-my-opencode/dist/index.js"]
}
OCJSON

if [ ! -f "$OPENCODE_CONFIG/oh-my-opencode.json" ]; then
  cat > "$OPENCODE_CONFIG/oh-my-opencode.json" << 'OMOJSON'
{
  "agents": {
    "sisyphus":         { "model": "anthropic/claude-opus-4-6",      "variant": "max" },
    "sisyphus-junior":  { "model": "anthropic/claude-sonnet-4-20250514" },
    "oracle":           { "model": "anthropic/claude-opus-4-6",      "variant": "max" },
    "explore":          { "model": "anthropic/claude-haiku-4-5" },
    "librarian":        { "model": "anthropic/claude-sonnet-4-6" },
    "multimodal-looker":{ "model": "anthropic/claude-haiku-4-5" },
    "prometheus":       { "model": "anthropic/claude-opus-4-6",      "variant": "max" },
    "metis":            { "model": "anthropic/claude-opus-4-6",      "variant": "max" },
    "momus":            { "model": "anthropic/claude-opus-4-6",      "variant": "max" },
    "atlas":            { "model": "anthropic/claude-sonnet-4-6" }
  },
  "categories": {
    "visual-engineering": { "model": "anthropic/claude-opus-4-6",    "variant": "max" },
    "ultrabrain":         { "model": "anthropic/claude-opus-4-6",    "variant": "max" },
    "quick":              { "model": "anthropic/claude-haiku-4-5" },
    "unspecified-low":    { "model": "anthropic/claude-sonnet-4-6" },
    "unspecified-high":   { "model": "anthropic/claude-opus-4-6",    "variant": "max" },
    "writing":            { "model": "anthropic/claude-sonnet-4-6" }
  }
}
OMOJSON
  echo "oh-my-opencode default config written"
fi

# --- Prevent env vars leaking into OpenCode as API keys ----------------------
unset ANTHROPIC_API_KEY

exec "$@"
