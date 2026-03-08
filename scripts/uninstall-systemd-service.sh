#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run this script as root (or with sudo)." >&2
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_DIR="/etc/systemd/system"
SERVICE_NAME="zoho-books-mcp"
SYSTEM_CTL="${ZOHO_MCP_SYSTEMCTL_BIN:-systemctl}"
LOGROTATE_FILE="${ZOHO_MCP_LOGROTATE_FILE:-/etc/logrotate.d/zoho-books-mcp}"
REMOVE_LOGROTATE="${ZOHO_MCP_REMOVE_LOGROTATE:-0}"
REMOVE_LOGS="${ZOHO_MCP_REMOVE_LOGS:-0}"

SERVICE_FILES=(
  "$SYSTEMD_DIR/$SERVICE_NAME.service"
  "$SYSTEMD_DIR/$SERVICE_NAME-healthcheck.service"
  "$SYSTEMD_DIR/$SERVICE_NAME-healthcheck.timer"
)

for unit in "$SERVICE_NAME.service" "$SERVICE_NAME-healthcheck.timer"; do
  if $SYSTEM_CTL is-enabled "$unit" >/dev/null 2>&1; then
    $SYSTEM_CTL disable "$unit" || true
  fi
  if $SYSTEM_CTL is-active "$unit" >/dev/null 2>&1; then
    $SYSTEM_CTL stop "$unit" || true
  fi
done

for file in "${SERVICE_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
  fi
done

if [ "$REMOVE_LOGROTATE" = "1" ] && [ -f "$LOGROTATE_FILE" ]; then
  rm -f "$LOGROTATE_FILE"
  echo "removed logrotate config: $LOGROTATE_FILE"
fi

if [ "$REMOVE_LOGS" = "1" ]; then
  rm -f "$PROJECT_ROOT/.zoho-mcp.pid" "$PROJECT_ROOT/.zoho-mcp.log"
  echo "removed local MCP log/pid files from $PROJECT_ROOT"
fi

$SYSTEM_CTL daemon-reload

if [ -f "$PROJECT_ROOT/scripts/mcp-service.sh" ]; then
  "$PROJECT_ROOT/scripts/mcp-service.sh" stop >/dev/null 2>&1 || true
fi

echo "systemd artifacts removed for $SERVICE_NAME"
