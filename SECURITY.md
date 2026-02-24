# Security

## Token and credential storage

- **Where tokens live:** Refresh token and client credentials can be provided by:
  1. **Secrets file (recommended):** `OPENCLAW_SECRETS_DIR/zoho-books-mcp.json` (default `~/.openclaw/secrets/zoho-books-mcp.json`). Env vars override file values. Do not commit this file.
  2. **Environment variables:** `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORG_ID`, etc.

- **Token file permissions:** When writing the secrets file (e.g. via `scripts/oauth-setup.js`), the file is created with mode **0600** (owner read/write only). On load, the server repairs permissions to 0600 if the file exists and mode is more permissive.

- **Preflight validation:** Required credentials are validated at startup. The process exits immediately with a clear error if any required value is missing.

## Read-only default

- **ZOHO_READ_ONLY** defaults to **1** (enabled). Write tools (`zoho_books_create_contact`, `zoho_books_create_invoice`) are disabled unless you explicitly set `ZOHO_READ_ONLY=0` (or `false`/`off`). This reduces the risk of accidental changes when used in agentic workflows.

## Logging and redaction

- The server does not log tokens, client secrets, or refresh tokens.
- If you add logging, redact any credential or token values (e.g. mask or omit `ZOHO_REFRESH_TOKEN`, `ZOHO_CLIENT_SECRET`, and `Authorization` headers).

## Rate limiting and retries

- **429 (rate limit):** The HTTP client retries with backoff. It honors the `Retry-After` header when present; otherwise uses exponential backoff (up to 3 retries).
- **Request timeout:** Each API request has a 25-second timeout to avoid hanging agent runs; see `docs/DECISIONS.md` §3.
- **5xx:** One retry with backoff to tolerate transient server errors.
- **401:** Triggers a single token refresh and one retry; concurrent requests share one refresh (single-flight) to avoid thundering herd.

## Least-privilege scopes

- Request only the Zoho Books scopes you need. The OAuth setup script uses `ZohoBooks.fullaccess.all` for convenience. For production, consider limiting to specific scopes (e.g. `ZohoBooks.invoices.READ`, `ZohoBooks.contacts.READ`) in the Zoho API Console and when generating the auth URL.

## Secret scan

- Run `npm run secret-scan` before committing (or in CI) to detect likely secrets in the repo. It exits non-zero if patterns such as tokens, API keys, or private keys are found in text files.

## Reporting issues

- Do not open a public issue for security-sensitive bugs. Report via a private channel or the maintainer contact listed in the repository.
