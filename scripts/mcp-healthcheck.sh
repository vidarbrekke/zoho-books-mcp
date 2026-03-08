#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${ZOHO_MCP_NODE_BIN:-/usr/bin/node}"
OPENCLAW_SECRETS_DIR="${OPENCLAW_SECRETS_DIR:-/root/.openclaw/secrets}"

if [ ! -x "$NODE_BIN" ]; then
  echo "Node binary not executable: $NODE_BIN" >&2
  exit 1
fi

if [ ! -f "$ROOT/dist/index.js" ]; then
  echo "Build artifact missing: $ROOT/dist/index.js" >&2
  exit 1
fi

initialize_payload='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
tools_list_payload='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

initialize_response="$(printf '%s\n' "$initialize_payload" | OPENCLAW_SECRETS_DIR="$OPENCLAW_SECRETS_DIR" "$NODE_BIN" "$ROOT/dist/index.js")"
tools_response="$(printf '%s\n' "$tools_list_payload" | OPENCLAW_SECRETS_DIR="$OPENCLAW_SECRETS_DIR" "$NODE_BIN" "$ROOT/dist/index.js")"

if ! printf '%s' "$initialize_response" | grep -q '"protocolVersion"'; then
  echo "Health check failed: initialize response missing protocolVersion" >&2
  echo "$initialize_response" >&2
  exit 1
fi

if ! printf '%s' "$tools_response" | grep -q '"tools"'; then
  echo "Health check failed: tools/list response missing tools" >&2
  echo "$tools_response" >&2
  exit 1
fi

echo "Health check passed"
