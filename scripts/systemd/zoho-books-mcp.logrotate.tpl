{{LOG_FILE}} {
  daily
  rotate {{LOGROTATE_ROTATE}}
  size {{LOGROTATE_SIZE}}
  missingok
  notifempty
  compress
  delaycompress
  copytruncate
  create 0640 root root
}
