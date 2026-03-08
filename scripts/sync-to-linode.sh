#!/usr/bin/env bash
# Sync zoho-books-mcp repo to Linode ~/repositories (clone or pull).
# Usage: ./scripts/sync-to-linode.sh
# Requires: .linode.env with SSH_HOST, SSH_USER, SSH_KEY_PATH (or LINODE_HOST, LINODE_USER, LINODE_SSH_KEY)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.linode.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .linode.env. Copy .linode.env.example and set SSH_HOST, SSH_USER, SSH_KEY_PATH." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"
# Support both naming conventions
HOST="${SSH_HOST:-$LINODE_HOST}"
USER="${SSH_USER:-$LINODE_USER}"
KEY="${SSH_KEY_PATH:-$LINODE_SSH_KEY}"
KEY_EXPANDED="${KEY/#\~/$HOME}"
for v in HOST USER KEY; do
  if [ -z "${!v}" ]; then
    echo "Set SSH_HOST, SSH_USER, SSH_KEY_PATH (or LINODE_*) in .linode.env" >&2
    exit 1
  fi
done
if [ ! -f "$KEY_EXPANDED" ]; then
  echo "SSH key not found: $KEY_EXPANDED" >&2
  exit 1
fi

ssh -i "$KEY_EXPANDED" "$USER@$HOST" \
  'mkdir -p ~/repositories && cd ~/repositories && \
   if [ -d zoho-books-mcp ]; then \
     (cd zoho-books-mcp && git pull origin master) && echo "Updated zoho-books-mcp"; \
   else \
     git clone https://github.com/vidarbrekke/zoho-books-mcp.git zoho-books-mcp && echo "Cloned zoho-books-mcp"; \
   fi'
