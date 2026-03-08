[Unit]
Description=Zoho Books MCP health check timer

[Timer]
OnBootSec={{HEALTHCHECK_BOOT}}
OnUnitActiveSec={{HEALTHCHECK_INTERVAL}}
AccuracySec=1m
Persistent=true
Unit={{SERVICE_NAME}}-healthcheck.service

[Install]
WantedBy=timers.target
