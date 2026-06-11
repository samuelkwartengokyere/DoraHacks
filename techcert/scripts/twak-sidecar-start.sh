#!/usr/bin/env bash
# Run TWAK REST sidecar for Vercel → autonomous signing + x402 + competition_register.
# Deploy this on Railway, Fly.io, or a VPS — NOT on Vercel serverless.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/backend/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^(TWAK_|TWAK_REST_)' "$ENV_FILE" | sed 's/#.*//')
  set +a
fi

: "${TWAK_HMAC_SECRET:?Set TWAK_HMAC_SECRET (same value as TWAK_API_KEY on Vercel)}"
: "${TWAK_WALLET_PASSWORD:?Set TWAK_WALLET_PASSWORD for autonomous agent wallet signing}"

# Railway injects PORT — must listen on that port for public networking.
PORT="${PORT:-${TWAK_REST_PORT:-3001}}"
HOST="${TWAK_REST_HOST:-0.0.0.0}"

TWAK_BIN="${ROOT_DIR}/node_modules/.bin/twak"
if [[ ! -x "$TWAK_BIN" ]]; then
  TWAK_BIN="npx --yes @trustwallet/cli"
fi

echo "Starting TWAK REST sidecar on ${HOST}:${PORT}"
echo "Point Vercel TWAK_API_URL to this host's public URL (no /actions suffix)"
echo "Railway PORT=${PORT}"

export TWAK_ACCESS_ID="${TWAK_ACCESS_ID:-}"
export TWAK_HMAC_SECRET

$TWAK_BIN init --json || true

if $TWAK_BIN wallet status --json 2>/dev/null | grep -q '"agentWallet": "not configured"'; then
  echo "No TWAK wallet found — creating one for this host..."
  $TWAK_BIN wallet create \
    --password "$TWAK_WALLET_PASSWORD" \
    --skip-password-check \
    --no-keychain \
    --json
  echo "Update AGENT_WALLET_ADDRESS on Vercel to the bsc address printed above."
fi

WATCH_ARGS=()
if [[ "${RAILWAY_ENVIRONMENT:-}" == "" && "${DISABLE_TWAK_WATCH:-}" == "" ]]; then
  WATCH_ARGS=(--watch --watch-interval 5m)
fi

exec $TWAK_BIN serve --rest \
  --port "$PORT" \
  --host "$HOST" \
  --password "$TWAK_WALLET_PASSWORD" \
  "${WATCH_ARGS[@]}"
