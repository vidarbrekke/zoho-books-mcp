# OpenClaw + Zoho Books MCP Readiness

Use this checklist before testing the MCP server with OpenClaw (or Cursor/Claude).

---

## 1. Zoho credentials (required)

The server needs these to call the Zoho Books API. **We have not created these in this repo.**

- [ ] **Zoho API app**  
  Create a Server-based Application at [Zoho API Console](https://api-console.zoho.com/).  
  Add a redirect URI (e.g. `http://127.0.0.1:8380/callback` for the OAuth script).

- [ ] **Client ID and Client Secret**  
  From the same app in the API Console.

- [ ] **Refresh token**  
  Run once (on a machine with a browser):
  ```bash
  npm install && npm run build
  ZOHO_CLIENT_ID=… ZOHO_CLIENT_SECRET=… npm run oauth-setup
  ```
  Authorize in the browser; the script writes the refresh token to the secrets file.

- [ ] **Organization ID**  
  From Zoho Books → Settings → Organization. Required for all API calls.

- [ ] **Region**  
  `ZOHO_REGION`: `US` | `EU` | `IN` | `AU` | `JP` | `CA` (default `US`).

**Where to put them**

- **Local / OpenClaw:**  
  Secrets file at `~/.openclaw/secrets/zoho-books-mcp.json` (or set `OPENCLAW_SECRETS_DIR`).  
  Keys: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID`, `ZOHO_REGION`, optional `ZOHO_READ_ONLY`.

- **Linode (or any server):**  
  Either copy that secrets file to the server (e.g. into `~/repositories/zoho-books-mcp` or a path you set with `OPENCLAW_SECRETS_DIR`), or set the same variables in the process environment when starting the MCP server.

---

## 2. Local / Cursor (where OpenClaw runs)

- [ ] Node 18+ installed.
- [ ] `npm install && npm run build` in the repo.
- [ ] Secrets file present with the keys above (or env vars set).
- [ ] MCP config points to this server:  
  Command `node`, args `["/path/to/zoho-books-mcp/dist/index.js"]`, and env (or a script that loads the secrets file) so the server sees the Zoho credentials.

---

## 3. Linode (optional: run MCP there)

- [ ] Repo synced (e.g. `./scripts/sync-to-linode.sh`).
- [ ] On the server: `npm install && npm run build`.
- [ ] Zoho credentials on the server: either copy `zoho-books-mcp.json` to a directory and set `OPENCLAW_SECRETS_DIR`, or set `ZOHO_*` env vars when starting the process.
- [ ] If OpenClaw runs elsewhere and talks to Linode, you’d need a transport other than stdio (e.g. SSE) — not implemented in this repo today; typically OpenClaw/Cursor runs the MCP server locally as a subprocess.

---

## 4. Milestone A readiness smoke runbook

- [ ] Confirm tooling:
  - [ ] `npm install`
  - [ ] `npm run build`
  - [ ] `npm run test`
  - [ ] `npm run type-check`

- [ ] Confirm read tools resolve with real MCP-style requests:
  - [ ] `initialize`
  - [ ] `tools/list`
  - [ ] `tools/call` for `zoho_books_list_invoices`, `zoho_books_list_bills`, `zoho_books_get_report`

- [ ] Confirm write guarding:
  - [ ] `ZOHO_READ_ONLY=1` blocks write tools (`create_contact`, `create_invoice`) with the expected API error message.
  - [ ] `ZOHO_READ_ONLY=0` allows writes if credentials + refresh token are valid.

- [ ] Confirm transport/invariants:
  - [ ] `tools/call` payloads include `service` and `operation` in normalized envelopes.
  - [ ] Repeated parallel calls do not exhaust with malformed behavior (no unbounded queue growth).

- [ ] Confirm docs/UX are complete for developers:
  - [ ] `README.md` usage examples for bills, banks, and date-ranged report calls are present.
  - [ ] Checklist item A5 can be marked complete.
  - [ ] Checklist item A6 can be marked complete.

Expected command for one-off smoke check (local, after `npm run build`):

```bash
node dist/index.js <<'EOF'
{"jsonrpc":"2.0","id":"init","method":"initialize","params":{}}
{"jsonrpc":"2.0","id":"list","method":"tools/list"}
{"jsonrpc":"2.0","id":"example-call","method":"tools/call","params":{"name":"zoho_books_list_bills","arguments":{"status":"open"}}}
EOF
```

## Summary

- **Code:** Ready (tools, config, secrets file support).
- **Credentials:** Not created; you must create the Zoho app, run the OAuth flow once, and place the resulting credentials where the MCP server runs (secrets file or env).
- **OpenClaw test:** After the credentials are in place and the MCP server is registered (e.g. in Cursor’s MCP settings), you can test by asking the agent to use a Zoho Books tool (e.g. list invoices).
