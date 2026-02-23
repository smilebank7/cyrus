#!/bin/bash
set -euo pipefail

SYLAS_ROOT="${SYLAS_ROOT:-/opt/sylas}"
STATE_DIR="$SYLAS_ROOT/state"
CONTAINER="sylas"

echo "=== Migrate Docker volumes → host bind mounts ==="
echo "This copies auth/state from the running sylas container to $STATE_DIR"
echo ""

if ! docker inspect "$CONTAINER" &>/dev/null; then
  echo "FATAL: Container '$CONTAINER' not found. Start the OLD container first."
  exit 1
fi

mkdir -p "$STATE_DIR"/{sylas,opencode,opencode-config,gh}
touch "$STATE_DIR/git-credentials"

echo "[1/4] Copying OpenCode auth..."
docker cp "$CONTAINER":/root/.local/share/opencode/auth.json "$STATE_DIR/opencode/auth.json" 2>/dev/null \
  && echo "  ✓ auth.json" \
  || echo "  ✗ auth.json not found in container"

echo "[2/4] Copying Sylas config..."
docker cp "$CONTAINER":/root/.sylas/. "$STATE_DIR/sylas/" 2>/dev/null \
  && echo "  ✓ .sylas/" \
  || echo "  ✗ .sylas not found in container"

echo "[3/4] Copying git credentials..."
docker cp "$CONTAINER":/root/.git-credentials "$STATE_DIR/git-credentials" 2>/dev/null \
  && echo "  ✓ git-credentials" \
  || echo "  ✗ .git-credentials not found in container"

echo "[4/4] Copying gh CLI config..."
docker cp "$CONTAINER":/root/.config/gh/. "$STATE_DIR/gh/" 2>/dev/null \
  && echo "  ✓ gh/" \
  || echo "  ✗ .config/gh not found in container"

chmod 600 "$STATE_DIR/opencode/auth.json" 2>/dev/null || true
chmod 600 "$STATE_DIR/git-credentials" 2>/dev/null || true

touch "$STATE_DIR/.migrated"

echo ""
echo "=== Migration complete ==="
echo "Remove ANTHROPIC_API_KEY from $SYLAS_ROOT/.env, then:"
echo "  cd $SYLAS_ROOT && sudo docker compose up -d --force-recreate"
