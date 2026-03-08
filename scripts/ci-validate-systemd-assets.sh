#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/systemd"
SYSTEMD_SERVICE="zoho-books-mcp"
NODE_BIN="${ZOHO_MCP_NODE_BIN:-/usr/bin/node}"
SERVICE_USER="${ZOHO_MCP_SERVICE_USER:-root}"
SERVICE_GROUP="${ZOHO_MCP_SERVICE_GROUP:-$SERVICE_USER}"
LOG_FILE="${ZOHO_MCP_LOG:-$PROJECT_ROOT/.zoho-mcp.log}"
OPENCLAW_SECRETS_DIR="${ZOHO_MCP_SECRETS_DIR:-/root/.openclaw/secrets}"
ENV_FILE="${ZOHO_MCP_ENV_FILE:-/etc/zoho-books-mcp.env}"
HEALTHCHECK_BOOT="${ZOHO_MCP_HEALTHCHECK_BOOT:-2m}"
HEALTHCHECK_INTERVAL="${ZOHO_MCP_HEALTHCHECK_INTERVAL:-5m}"
LOGROTATE_ENABLED="${ZOHO_MCP_CHECK_LOGROTATE:-0}"
LOGROTATE_FILE="${ZOHO_MCP_LOGROTATE_FILE:-/etc/logrotate.d/zoho-books-mcp}"
LOGROTATE_ROTATE="${ZOHO_MCP_LOGROTATE_ROTATE:-7}"
LOGROTATE_SIZE="${ZOHO_MCP_LOGROTATE_SIZE:-100M}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

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
    -e "s|{{SERVICE_NAME}}|$SYSTEMD_SERVICE|g" \
    -e "s|{{SERVICE_USER}}|$SERVICE_USER|g" \
    -e "s|{{SERVICE_GROUP}}|$SERVICE_GROUP|g" \
    -e "s|{{LOG_FILE}}|$LOG_FILE|g" \
    -e "s|{{HEALTHCHECK_BOOT}}|$HEALTHCHECK_BOOT|g" \
    -e "s|{{HEALTHCHECK_INTERVAL}}|$HEALTHCHECK_INTERVAL|g" \
    -e "s|{{LOGROTATE_ROTATE}}|$LOGROTATE_ROTATE|g" \
    -e "s|{{LOGROTATE_SIZE}}|$LOGROTATE_SIZE|g" \
    "$template_file" > "$destination"

  if grep -q '{{' "$destination"; then
    echo "Template rendering failed (unresolved tokens) for $destination" >&2
    exit 1
  fi
}

must_have() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if ! grep -qE "$pattern" "$file"; then
    echo "Rendered $label missing expected token in $file" >&2
    exit 1
  fi
}

echo "Validating systemd deployment assets for CI"

need_cmd sed
need_cmd mktemp
need_cmd "$NODE_BIN"

if [ ! -x "$SCRIPT_DIR/mcp-healthcheck.sh" ]; then
  echo "Missing executable healthcheck script: $SCRIPT_DIR/mcp-healthcheck.sh" >&2
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/dist/index.js" ]; then
  echo "Missing build artifact: $PROJECT_ROOT/dist/index.js (run npm run build in CI)" >&2
  exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Missing template directory: $TEMPLATE_DIR" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

render_template "$TEMPLATE_DIR/$SYSTEMD_SERVICE.service.tpl" "$tmp_dir/$SYSTEMD_SERVICE.service"
render_template "$TEMPLATE_DIR/$SYSTEMD_SERVICE-healthcheck.service.tpl" "$tmp_dir/$SYSTEMD_SERVICE-healthcheck.service"
render_template "$TEMPLATE_DIR/$SYSTEMD_SERVICE-healthcheck.timer.tpl" "$tmp_dir/$SYSTEMD_SERVICE-healthcheck.timer"

must_have "$tmp_dir/$SYSTEMD_SERVICE.service" '^ExecStart=' "service exec command"
must_have "$tmp_dir/$SYSTEMD_SERVICE.service" 'WantedBy=multi-user.target' "service install target"
must_have "$tmp_dir/$SYSTEMD_SERVICE-healthcheck.service" '^ExecStart=' "healthcheck exec command"
must_have "$tmp_dir/$SYSTEMD_SERVICE-healthcheck.timer" '^Unit=' "healthcheck timer target"

if command -v systemd-analyze >/dev/null 2>&1; then
  systemd-analyze verify "$tmp_dir/$SYSTEMD_SERVICE.service" "$tmp_dir/$SYSTEMD_SERVICE-healthcheck.service" "$tmp_dir/$SYSTEMD_SERVICE-healthcheck.timer"
fi

if [ "$LOGROTATE_ENABLED" = "1" ]; then
  render_template "$TEMPLATE_DIR/$SYSTEMD_SERVICE.logrotate.tpl" "$tmp_dir/$SYSTEMD_SERVICE.logrotate"
  if ! grep -q "$(printf '%s' "$LOG_FILE")" "$tmp_dir/$SYSTEMD_SERVICE.logrotate"; then
    echo "Rendered logrotate config does not include $LOG_FILE" >&2
    exit 1
  fi
  echo "Rendered logrotate target: $LOGROTATE_FILE"
fi

echo "Rendered systemd service: $tmp_dir/$SYSTEMD_SERVICE.service"
echo "Rendered healthcheck service: $tmp_dir/$SYSTEMD_SERVICE-healthcheck.service"
echo "Rendered healthcheck timer: $tmp_dir/$SYSTEMD_SERVICE-healthcheck.timer"
if [ "$LOGROTATE_ENABLED" = "1" ]; then
  echo "Rendered logrotate template: $tmp_dir/$SYSTEMD_SERVICE.logrotate"
fi

echo "CI systemd asset validation: PASS"
