#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/.zoho-mcp.pid"
LOG_FILE="${ZOHO_MCP_LOG:-$ROOT/.zoho-mcp.log}"

is_running() {
  if [ ! -f "$PID_FILE" ]; then
    return 1
  fi
  pid="$(cat "$PID_FILE")"
  if [ -z "$pid" ]; then
    return 1
  fi
  if kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  return 1
}

status() {
  if is_running; then
    pid="$(cat "$PID_FILE")"
    echo "MCP running (pid=$pid)"
  else
    echo "MCP is not running"
    return 1
  fi
}

start() {
  if is_running; then
    status
    return 0
  fi
  set -a
  if [ -f "$ROOT/.env" ]; then
    # shellcheck source=/dev/null
    source "$ROOT/.env"
  fi
  set +a
  nohup sh -c "tail -f /dev/null | /usr/bin/node '$ROOT/dist/index.js'" >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1
  status
}

stop() {
  if ! is_running; then
    echo "MCP is not running"
    return 0
  fi
  pid="$(cat "$PID_FILE")"
  kill "$pid"
  rm -f "$PID_FILE"
  echo "Stopped MCP (pid=$pid)"
}

restart() {
  stop
  start
}

logs() {
  tail -n "${ZOHO_MCP_TAIL:-100}" "$LOG_FILE"
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  *)
    echo "Usage: $0 <start|stop|restart|status|logs>"
    echo "Optional: ZOHO_MCP_LOG, ZOHO_MCP_TAIL"
    exit 1
    ;;
esac
