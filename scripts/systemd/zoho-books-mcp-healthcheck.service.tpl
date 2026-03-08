[Unit]
Description=Zoho Books MCP health check
After={{SERVICE_NAME}}.service

[Service]
Type=oneshot
WorkingDirectory={{PROJECT_ROOT}}
Environment=OPENCLAW_SECRETS_DIR={{OPENCLAW_SECRETS_DIR}}
EnvironmentFile=-{{ENV_FILE}}
ExecStart={{PROJECT_ROOT}}/scripts/mcp-healthcheck.sh

[Install]
WantedBy=multi-user.target
