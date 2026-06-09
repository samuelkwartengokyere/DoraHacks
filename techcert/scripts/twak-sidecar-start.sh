#!/usr/bin/env bash
# Run TWAK REST sidecar for Vercel → autonomous signing + x402 + competition_register.
# Deploy this on Railway, Fly.io, or a VPS — NOT on Vercel serverless.
set -euo pipefail

: "${TWAK_HMAC_SECRET:?Set TWAK_HMAC_SECRET (same value as TWAK_API_KEY on Vercel)}"
: "${TWAK_WALLET_PASSWORD:?Set TWAK_WALLET_PASSWORD for autonomous agent wallet signing}"

PORT="${TWAK_REST_PORT:-3001}"
HOST="${TWAK_REST_HOST:-0.0.0.0}"

echo "Starting TWAK REST sidecar on ${HOST}:${PORT}"
echo "Point Vercel TWAK_API_URL to this host's public URL"

exec npx @trustwallet/cli serve --rest \
  --port "$PORT" \
  --host "$HOST" \
  --password "$TWAK_WALLET_PASSWORD" \
  --watch \
  --watch-interval 5m
