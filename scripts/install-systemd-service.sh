#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run this script as root (or with sudo)." >&2
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_DIR="/etc/systemd/system"
NODE_BIN="${ZOHO_MCP_NODE_BIN:-/usr/bin/node}"
OPENCLAW_SECRETS_DIR="${ZOHO_MCP_SECRETS_DIR:-/root/.openclaw/secrets}"
ENV_FILE="${ZOHO_MCP_ENV_FILE:-/etc/zoho-books-mcp.env}"
SERVICE_NAME="zoho-books-mcp"

if [ ! -x "$NODE_BIN" ]; then
  echo "Node binary not executable: $NODE_BIN" >&2
  exit 1
fi

cat > "$SYSTEMD_DIR/$SERVICE_NAME.service" <<SERVICE
[Unit]
Description=Zoho Books MCP Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT
Environment=OPENCLAW_SECRETS_DIR=$OPENCLAW_SECRETS_DIR
EnvironmentFile=-$ENV_FILE
ExecStart=/bin/sh -c 'tail -f /dev/null | $NODE_BIN $PROJECT_ROOT/dist/index.js'
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5
KillSignal=SIGINT
TimeoutStopSec=20
StandardOutput=append:$PROJECT_ROOT/.zoho-mcp.log
StandardError=append:$PROJECT_ROOT/.zoho-mcp.log

[Install]
WantedBy=multi-user.target
SERVICE

cat > "$SYSTEMD_DIR/$SERVICE_NAME-healthcheck.service" <<CHECK
[Unit]
Description=Zoho Books MCP health check
After=$SERVICE_NAME.service

[Service]
Type=oneshot
WorkingDirectory=$PROJECT_ROOT
Environment=OPENCLAW_SECRETS_DIR=$OPENCLAW_SECRETS_DIR
EnvironmentFile=-$ENV_FILE
ExecStart=$PROJECT_ROOT/scripts/mcp-healthcheck.sh

[Install]
WantedBy=multi-user.target
CHECK

cat > "$SYSTEMD_DIR/$SERVICE_NAME-healthcheck.timer" <<TIMER
[Unit]
Description=Zoho Books MCP health check timer

[Timer]
OnBootSec=2m
OnUnitActiveSec=5m
AccuracySec=1m
Persistent=true
Unit=$SERVICE_NAME-healthcheck.service

[Install]
WantedBy=timers.target
TIMER

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
