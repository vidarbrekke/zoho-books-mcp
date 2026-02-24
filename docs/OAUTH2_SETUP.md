# OAuth2 setup for Zoho Books MCP

This project uses OAuth2 with a **refresh token** so the MCP server can call the Zoho Books API without storing your password.

## Quick setup (recommended)

1. **Create a Server-based Application** in [Zoho API Console](https://api-console.zoho.com/):
   - Add Client → Server-based Applications
   - Client Name: e.g. `Zoho Books MCP`
   - Homepage URL: `http://localhost`
   - Authorized Redirect URIs: `http://127.0.0.1:8380/callback` (and optionally `http://127.0.0.1:8381/callback`, `8382` if you run setup on a machine where 8380 is in use)

2. **Set client credentials** in the environment (or in a `.env` you load before running):
   ```bash
   export ZOHO_CLIENT_ID="1000.xxxxxxxxxxxx"
   export ZOHO_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export ZOHO_REGION=US   # or EU, IN, AU, JP, CA
   ```

3. **Run the OAuth setup script:**
   ```bash
   npm run oauth-setup
   ```
   - A browser window opens for Zoho sign-in and consent.
   - After you authorize, the script exchanges the code for tokens and writes them to the **secrets file** with permissions **0600**.

4. **Secrets file location**
   - Default: `~/.openclaw/secrets/zoho-books-mcp.json`
   - Override with: `OPENCLAW_SECRETS_DIR=/path/to/dir npm run oauth-setup`

5. **Add organization ID**
   - Get it from Zoho Books → Settings → Organization.
   - Add to the secrets file as `ZOHO_ORG_ID` or set the env var when running the MCP server.

## Scopes

The setup script requests **ZohoBooks.fullaccess.all** so all Books API operations work. For least-privilege, create a custom script that uses only the scopes you need (e.g. `ZohoBooks.invoices.READ,ZohoBooks.contacts.READ`) and register the redirect URI that script uses.

## Token file format

The secrets file is JSON with string values, for example:

```json
{
  "ZOHO_CLIENT_ID": "1000.xxxx",
  "ZOHO_CLIENT_SECRET": "xxxx",
  "ZOHO_REFRESH_TOKEN": "1000.xxxx.xxxx",
  "ZOHO_REGION": "US",
  "ZOHO_ORG_ID": "123456789"
}
```

The MCP server loads this file when present and overlays environment variables, so you can override any key with env.

## Security

- The file is written with **mode 0600** (owner read/write only). On load, the server repairs permissions to 0600 if they have drifted.
- Do not commit the secrets file or put it under version control.
- See [SECURITY.md](../SECURITY.md) for full notes.

## Manual token exchange

If you cannot run the script (e.g. headless server), complete the OAuth flow on a machine with a browser, then copy the **refresh_token** into your secrets file or `ZOHO_REFRESH_TOKEN` env var. The MCP server uses only the refresh token to obtain access tokens; it does not need the initial auth code after the first exchange.
