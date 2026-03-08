# Zoho Books MCP Server

MCP server that connects AI clients (Cursor, Claude Desktop, etc.) to Zoho Books.
It supports read tools (invoices, contacts, expenses, items, reports) and guarded
write tools (create contact, create invoice).

## Requirements

- Node.js 18+
- Zoho OAuth client credentials
- Zoho Books organization ID

## Environment Variables

Copy `.env.example` and set values, or use a **secrets file** (recommended so the repo can be shared without creds):

- **Secrets file:** Put `zoho-books-mcp.json` in `OPENCLAW_SECRETS_DIR` (default: `~/.openclaw/secrets/`). Keys: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID`, `ZOHO_REGION`, `ZOHO_READ_ONLY`. Env vars override file values. The file is created with permissions **0600** when using `npm run oauth-setup`.
- **Otherwise** set in the environment:
  - `ZOHO_CLIENT_ID`
  - `ZOHO_CLIENT_SECRET`
  - `ZOHO_REFRESH_TOKEN`
  - `ZOHO_ORG_ID`
  - `ZOHO_REGION` (`US|EU|IN|AU|JP|CA`, default `US`)
  - `ZOHO_READ_ONLY` (`1` by default; set `0` to enable write tools)

## Getting a Zoho Refresh Token

**Option A – OAuth setup script (recommended)**

1. Create a Server-based Application in [Zoho API Console](https://api-console.zoho.com/) and add a redirect URI like `http://127.0.0.1:8380/callback` (port is chosen automatically).
2. Set `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` in the environment (or in a `.env` you load).
3. Run: `npm run oauth-setup`. A browser will open for Zoho login; after authorizing, tokens are written to the secrets file with mode 0600.
4. Add `ZOHO_ORG_ID` to the same file or to env (from Zoho Books → Settings → Organization).

**Option B – Manual**

1. Open Zoho API Console and create a client.
2. Request OAuth scopes for Books (e.g. `ZohoBooks.fullaccess.all` or granular scopes).
3. Complete the OAuth authorization flow once and exchange the auth code for tokens.
4. Save the **refresh_token** in `ZOHO_REFRESH_TOKEN` or in the secrets file.

## Run

```bash
npm install
npm run build
npm start
```

You can also start the MCP server using the local `.env` file directly (useful when values are stored there and not exported in your shell):

```bash
./scripts/run-mcp-with-env.sh
```

For a headless server (example path for this project on Linode), start from the repo root with:

```bash
cd /root/openclaw-stock-home/.openclaw/workspace/repositories/zoho
npm install
npm run build
./scripts/run-mcp-with-env.sh < /dev/null > /tmp/zoho-mcp.log 2>&1 &
```

You can verify it started with:

```bash
ps -ef | grep dist/index.js
```

## MCP Client Config (stdio)

### Copy-paste: Cursor `mcpServers` entry

In Cursor settings (e.g. **Settings → MCP**), add a server entry. Replace `/path/to/zoho-books-mcp` with your repo path. Env can be loaded from your secrets file or `.env`; ensure `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID` (and optionally `ZOHO_REGION`, `OPENCLAW_SECRETS_DIR`) are set.

```json
{
  "mcpServers": {
    "zoho-books": {
      "command": "node",
      "args": ["/path/to/zoho-books-mcp/dist/index.js"],
      "env": {
        "ZOHO_CLIENT_ID": "<your client id>",
        "ZOHO_CLIENT_SECRET": "<your client secret>",
        "ZOHO_REFRESH_TOKEN": "<your refresh token>",
        "ZOHO_ORG_ID": "<your org id>",
        "ZOHO_REGION": "US"
      }
    }
  }
}
```

Or point `env` at a script that loads `~/.openclaw/secrets/zoho-books-mcp.json`; then you can omit the keys from the JSON.

### Cursor (manual)

Use your MCP settings to run:

- Command: `node`
- Args: `["/absolute/path/to/zoho-books-mcp/dist/index.js"]`
- Env: include all `ZOHO_*` variables above

### Claude Desktop

Add an MCP server entry using stdio with the same command/args/env as above.

## Tool List

- `zoho_books_list_invoices`
- `zoho_books_get_invoice`
- `zoho_books_list_contacts`
- `zoho_books_get_contact`
- `zoho_books_list_expenses`
- `zoho_books_get_expense`
- `zoho_books_list_bills`
- `zoho_books_get_bill`
- `zoho_books_list_bank_transactions`
- `zoho_books_list_bank_accounts`
- `zoho_books_list_items`
- `zoho_books_get_item`
- `zoho_books_get_report`
- `zoho_books_create_contact` (disabled when `ZOHO_READ_ONLY=1`)
- `zoho_books_create_invoice` (disabled when `ZOHO_READ_ONLY=1`)

## Safety Notes

- `ZOHO_READ_ONLY=1` is the default; write tools are blocked unless you set `ZOHO_READ_ONLY=0`.
- Use the secrets file under `~/.openclaw/secrets/` (or `OPENCLAW_SECRETS_DIR`) so credentials are not in the repo.
- Run `npm run secret-scan` before committing (or in CI) to detect accidental secrets.
- See [SECURITY.md](SECURITY.md) for token storage, permissions, logging, and scopes.
