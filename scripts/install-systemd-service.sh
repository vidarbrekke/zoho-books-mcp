#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run this script as root (or with sudo)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_DIR="/etc/systemd/system"
TEMPLATE_DIR="$SCRIPT_DIR/systemd"
NODE_BIN="${ZOHO_MCP_NODE_BIN:-/usr/bin/node}"
OPENCLAW_SECRETS_DIR="${ZOHO_MCP_SECRETS_DIR:-/root/.openclaw/secrets}"
ENV_FILE="${ZOHO_MCP_ENV_FILE:-/etc/zoho-books-mcp.env}"
SERVICE_NAME="zoho-books-mcp"
SERVICE_USER="${ZOHO_MCP_SERVICE_USER:-root}"
SERVICE_GROUP="${ZOHO_MCP_SERVICE_GROUP:-$SERVICE_USER}"
LOG_FILE="${ZOHO_MCP_LOG:-$PROJECT_ROOT/.zoho-mcp.log}"
HEALTHCHECK_BOOT="${ZOHO_MCP_HEALTHCHECK_BOOT:-2m}"
HEALTHCHECK_INTERVAL="${ZOHO_MCP_HEALTHCHECK_INTERVAL:-5m}"
LOGROTATE_ENABLED="${ZOHO_MCP_LOGROTATE:-0}"
LOGROTATE_FILE="${ZOHO_MCP_LOGROTATE_FILE:-/etc/logrotate.d/zoho-books-mcp}"
LOGROTATE_ROTATE="${ZOHO_MCP_LOGROTATE_ROTATE:-7}"
LOGROTATE_SIZE="${ZOHO_MCP_LOGROTATE_SIZE:-100M}"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Template directory not found: $TEMPLATE_DIR" >&2
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/dist/index.js" ]; then
  echo "Build artifact missing: $PROJECT_ROOT/dist/index.js. Run npm run build first." >&2
  exit 1
fi

if [ ! -x "$NODE_BIN" ]; then
  echo "Node binary not executable: $NODE_BIN" >&2
  exit 1
fi

render_template() {
  local template_file="$1"
  local destination="$2"

  if [ ! -f "$template_file" ]; then
    echo "Missing template: $template_file" >&2
    exit 1
  fi

  sed \
    -e "s|{{PROJECT_ROOT}}|$PROJECT_ROOT|g" \
    -e "s|{{NODE_BIN}}|$NODE_BIN|g" \
    -e "s|{{OPENCLAW_SECRETS_DIR}}|$OPENCLAW_SECRETS_DIR|g" \
    -e "s|{{ENV_FILE}}|$ENV_FILE|g" \
    -e "s|{{SERVICE_NAME}}|$SERVICE_NAME|g" \
    -e "s|{{SERVICE_USER}}|$SERVICE_USER|g" \
    -e "s|{{SERVICE_GROUP}}|$SERVICE_GROUP|g" \
    -e "s|{{LOG_FILE}}|$LOG_FILE|g" \
    -e "s|{{HEALTHCHECK_BOOT}}|$HEALTHCHECK_BOOT|g" \
    -e "s|{{HEALTHCHECK_INTERVAL}}|$HEALTHCHECK_INTERVAL|g" \
    -e "s|{{LOGROTATE_ROTATE}}|$LOGROTATE_ROTATE|g" \
    -e "s|{{LOGROTATE_SIZE}}|$LOGROTATE_SIZE|g" \
    "$template_file" > "$destination"
}

render_template "$TEMPLATE_DIR/$SERVICE_NAME.service.tpl" "$SYSTEMD_DIR/$SERVICE_NAME.service"
render_template "$TEMPLATE_DIR/$SERVICE_NAME-healthcheck.service.tpl" "$SYSTEMD_DIR/$SERVICE_NAME-healthcheck.service"
render_template "$TEMPLATE_DIR/$SERVICE_NAME-healthcheck.timer.tpl" "$SYSTEMD_DIR/$SERVICE_NAME-healthcheck.timer"

if [ "$LOGROTATE_ENABLED" = "1" ]; then
  render_template "$TEMPLATE_DIR/$SERVICE_NAME.logrotate.tpl" "$LOGROTATE_FILE"
  chmod 0644 "$LOGROTATE_FILE"
  echo "installed logrotate config: $LOGROTATE_FILE"
fi

systemctl daemon-reload
systemctl enable "$SERVICE_NAME.service" "$SERVICE_NAME-healthcheck.timer"
systemctl restart "$SERVICE_NAME.service"
systemctl start "$SERVICE_NAME-healthcheck.timer"

echo "systemd deployed for $SERVICE_NAME."
echo "service unit:    $SYSTEMD_DIR/$SERVICE_NAME.service"
echo "health service:  $SYSTEMD_DIR/$SERVICE_NAME-healthcheck.service"
echo "health timer:    $SYSTEMD_DIR/$SERVICE_NAME-healthcheck.timer"
echo "status:"
systemctl status --no-pager "$SERVICE_NAME.service" || true
systemctl status --no-pager "$SERVICE_NAME-healthcheck.timer" || true
