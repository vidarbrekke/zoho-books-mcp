#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_NAME="zoho-books-mcp"
SYSTEM_CTL="${ZOHO_MCP_SYSTEMCTL_BIN:-systemctl}"
NODE_BIN="${ZOHO_MCP_NODE_BIN:-/usr/bin/node}"
LOGROTATE_FILE="${ZOHO_MCP_LOGROTATE_FILE:-/etc/logrotate.d/zoho-books-mcp}"
CHECK_LOGROTATE="${ZOHO_MCP_CHECK_LOGROTATE:-0}"
LOG_FILE="${ZOHO_MCP_LOG:-$PROJECT_ROOT/.zoho-mcp.log}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

expect_running() {
  local name="$1"
  if ! $SYSTEM_CTL is-active --quiet "$name"; then
    echo "Service is not active: $name" >&2
    echo "Run sudo $SYSTEM_CTL status $name" >&2
    exit 1
  fi
}

expect_enabled() {
  local name="$1"
  if ! $SYSTEM_CTL is-enabled --quiet "$name"; then
    echo "Service is not enabled: $name" >&2
    echo "Run sudo $SYSTEM_CTL enable $name" >&2
    exit 1
  fi
}

echo "Checking deployment preconditions..."
need_cmd "$SYSTEM_CTL"
need_cmd bash
need_cmd "$NODE_BIN"

if [ ! -x "$NODE_BIN" ]; then
  echo "Node binary is not executable: $NODE_BIN" >&2
  exit 1
fi

if [ ! -x "$PROJECT_ROOT/scripts/mcp-healthcheck.sh" ]; then
  echo "Missing healthcheck helper: $PROJECT_ROOT/scripts/mcp-healthcheck.sh" >&2
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/dist/index.js" ]; then
  echo "Build artifact missing: $PROJECT_ROOT/dist/index.js" >&2
  echo "Run npm run build" >&2
  exit 1
fi

expect_enabled "$SERVICE_NAME.service"
expect_running "$SERVICE_NAME.service"

expect_enabled "$SERVICE_NAME-healthcheck.timer"

echo "Running MCP transport healthcheck..."
if ! "$PROJECT_ROOT/scripts/mcp-healthcheck.sh" | grep -q "Health check passed"; then
  echo "Transport smoke check failed" >&2
  exit 1
fi

if [ "$CHECK_LOGROTATE" = "1" ]; then
  if [ ! -f "$LOGROTATE_FILE" ]; then
    echo "Expected logrotate config missing: $LOGROTATE_FILE" >&2
    exit 1
  fi
  if ! grep -q "$(printf '%s' "$LOG_FILE")" "$LOGROTATE_FILE"; then
    echo "Logrotate config does not reference expected file: $LOG_FILE" >&2
    exit 1
  fi
fi

echo "systemd deployment check: PASS"
echo "- service: $SERVICE_NAME.service"
echo "- health timer: $SERVICE_NAME-healthcheck.timer"
if [ "$CHECK_LOGROTATE" = "1" ]; then
  echo "- logrotate: $LOGROTATE_FILE"
fi
