[Unit]
Description=Zoho Books MCP Server
After=network.target

[Service]
Type=simple
User={{SERVICE_USER}}
Group={{SERVICE_GROUP}}
WorkingDirectory={{PROJECT_ROOT}}
Environment=OPENCLAW_SECRETS_DIR={{OPENCLAW_SECRETS_DIR}}
Environment=ZOHO_MCP_LOG={{LOG_FILE}}
EnvironmentFile=-{{ENV_FILE}}
ExecStart=/bin/sh -c 'tail -f /dev/null | {{NODE_BIN}} {{PROJECT_ROOT}}/dist/index.js'
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5
KillSignal=SIGINT
TimeoutStopSec=20
StandardOutput=append:{{LOG_FILE}}
StandardError=append:{{LOG_FILE}}

[Install]
WantedBy=multi-user.target
