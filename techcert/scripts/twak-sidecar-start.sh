#!/usr/bin/env bash
# Run TWAK REST sidecar for Vercel → autonomous signing + x402 + competition_register.
# Deploy this on Railway, Fly.io, or a VPS — NOT on Vercel serverless.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/backend/.env"

echo "=== TWAK sidecar boot ==="
echo "PWD=$(pwd) ROOT_DIR=${ROOT_DIR}"
echo "PORT=${PORT:-<unset>} RAILWAY_ENVIRONMENT=${RAILWAY_ENVIRONMENT:-<unset>}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^(TWAK_|TWAK_REST_)' "$ENV_FILE" | sed 's/#.*//')
  set +a
fi

if [[ -z "${TWAK_HMAC_SECRET:-}" ]]; then
  echo "ERROR: TWAK_HMAC_SECRET is not set (Railway → Variables)"
  exit 1
fi
if [[ -z "${TWAK_ACCESS_ID:-}" ]]; then
  echo "ERROR: TWAK_ACCESS_ID is not set (Railway → Variables)"
  exit 1
fi
if [[ -z "${TWAK_WALLET_PASSWORD:-}" ]]; then
  echo "ERROR: TWAK_WALLET_PASSWORD is not set (Railway → Variables)"
  exit 1
fi

PORT="${PORT:-${TWAK_REST_PORT:-3001}}"
HOST="${TWAK_REST_HOST:-0.0.0.0}"

export TWAK_ACCESS_ID="${TWAK_ACCESS_ID:-}"
export TWAK_HMAC_SECRET

twak_cmd() {
  if [[ -x "${ROOT_DIR}/node_modules/.bin/twak" ]]; then
    "${ROOT_DIR}/node_modules/.bin/twak" "$@"
  else
    npx --yes @trustwallet/cli "$@"
  fi
}

echo "Starting TWAK REST sidecar on ${HOST}:${PORT}"
echo "Set Vercel TWAK_API_URL to your Railway https URL (no /actions suffix)"

twak_cmd init --json || true

if twak_cmd wallet status --json 2>/dev/null | grep -q '"agentWallet": "not configured"'; then
  echo "No TWAK wallet on this host — creating one..."
  if twak_cmd wallet create \
    --password "$TWAK_WALLET_PASSWORD" \
    --skip-password-check \
    --no-keychain \
    --json; then
    echo "Update AGENT_WALLET_ADDRESS on Vercel to the bsc address above."
  else
    echo "WARN: wallet create failed; /actions may still respond for health checks."
  fi
fi

SERVE_ARGS=(
  serve --rest
  --port "$PORT"
  --host "$HOST"
  --password "$TWAK_WALLET_PASSWORD"
)

if [[ -x "${ROOT_DIR}/node_modules/.bin/twak" ]]; then
  exec "${ROOT_DIR}/node_modules/.bin/twak" "${SERVE_ARGS[@]}"
fi

exec npx --yes @trustwallet/cli "${SERVE_ARGS[@]}"
