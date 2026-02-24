# Zoho Books MCP Server

MCP server that connects AI clients (Cursor, Claude Desktop, etc.) to Zoho Books.
It supports read tools (invoices, contacts, expenses, items, reports) and guarded
write tools (create contact, create invoice).

## Requirements

- Node.js 18+
- Zoho OAuth client credentials
- Zoho Books organization ID

## Environment Variables

Copy `.env.example` and set:

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_ORG_ID`
- `ZOHO_REGION` (`US|EU|IN|AU|JP|CA`, default `US`)
- `ZOHO_READ_ONLY` (`1` by default; set `0` to enable write tools)

## Getting a Zoho Refresh Token

1. Open Zoho API Console and create a client.
2. Request OAuth scopes for Books (read and write scopes as needed).
3. Complete OAuth authorization flow once.
4. Exchange auth code for access+refresh token.
5. Save `refresh_token` in `ZOHO_REFRESH_TOKEN`.

## Run

```bash
npm install
npm run build
npm start
```

## MCP Client Config (stdio)

### Cursor

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
- `zoho_books_list_items`
- `zoho_books_get_item`
- `zoho_books_get_report`
- `zoho_books_create_contact` (disabled when `ZOHO_READ_ONLY=1`)
- `zoho_books_create_invoice` (disabled when `ZOHO_READ_ONLY=1`)

## Safety Notes

- `ZOHO_READ_ONLY=1` is the default behavior for safer use in agent loops.
- Write tools are hard-blocked unless you explicitly set `ZOHO_READ_ONLY=0`.
- Keep OAuth scopes minimal for your use case.
