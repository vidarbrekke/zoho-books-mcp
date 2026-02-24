# Zoho MCP Integration Plan

## Overview

Build a Model Context Protocol (MCP) server for Zoho's product suite, starting with Zoho Books. The server enables AI assistants (Claude, Cursor, etc.) to interact with Zoho data through well-defined, scoped tools.

**Target products:** Books, Writer, Sheets, Bookings, Mail, Campaigns, Desk, WorkDrive

---

## 1. Zoho API Landscape

### Shared Authentication

All Zoho products share a **single OAuth 2.0 system** at `accounts.zoho.com`. One app registration in the Zoho Developer Console yields a `client_id` / `client_secret` that works across all products. The token header format is identical everywhere:

```
Authorization: Zoho-oauthtoken {access_token}
```

- Access tokens expire after **1 hour**
- Refresh tokens **do not expire** unless revoked (max 20 per account)
- Supports all regions: US, EU, IN, AU, JP, CA, SA

### Separate APIs per Product

Each product has its own REST API with a distinct base URL and scope namespace:

| Product    | Base URL                                        | Scope Prefix       |
|------------|-------------------------------------------------|--------------------|
| **Books**  | `https://www.zohoapis.com/books/v3/`            | `ZohoBooks.*`      |
| Writer     | `https://www.zohoapis.com/writer/api/v1/`       | `ZohoWriter.*`     |
| Sheets     | `https://sheet.zoho.com/api/v2/`                | `ZohoSheet.*`      |
| Desk       | `https://desk.zoho.com/api/v1/`                 | `Desk.*`           |
| WorkDrive  | `https://workdrive.zoho.com/api/v1/`            | `WorkDrive.*`      |
| Mail       | `https://mail.zoho.com/api/`                    | `ZohoMail.*`       |
| Campaigns  | `https://campaigns.zoho.com/api/v1.1/`          | `ZohoCampaigns.*`  |
| Bookings   | `https://www.zohoapis.com/bookings/v1/`         | `ZohoBookings.*`   |

All support multi-datacenter routing via regional domain prefixes.

### Zoho Books API — Module Coverage (v3, production-stable)

Organizations, Contacts, Estimates, Sales Orders, Sales Receipts, Invoices, Recurring Invoices, Credit Notes, Customer Payments, Expenses, Recurring Expenses, Retainer Invoices, Purchase Orders, Bills, Recurring Bills, Vendor Credits, Vendor Payments, Bank Accounts, Bank Transactions, Items, Chart of Accounts, Journals, Reports, Custom Modules.

> Note: API v4 (Beta) is emerging but incomplete. v3 is the production target.

---

## 2. Architecture

### Strategy: Single server, modular internals — extensible to monorepo

Start with a single MCP server that exposes Books tools, built on a shared `core/` layer designed to plug in additional Zoho products without refactoring.

```
src/
  core/
    auth.ts           # OAuth2 client: token storage, auto-refresh, multi-DC
    http.ts           # Authenticated HTTP client with rate-limit handling
    types.ts          # Shared types: ZohoError, PaginatedResponse, Region, etc.
    config.ts         # Region, org ID, env var config
  books/
    client.ts         # Zoho Books API wrapper (uses core/http.ts)
    tools/
      invoices.ts     # MCP tools: list/get/create/update invoices
      contacts.ts     # MCP tools: list/get/create contacts
      expenses.ts     # MCP tools: list/get/create expenses
      payments.ts     # Customer & vendor payments
      reports.ts      # P&L, balance sheet, cash flow, A/R aging
      items.ts        # Product/service item catalog
  index.ts            # MCP server entry point: registers all tools
tests/
  unit/
    core/
    books/
  integration/        # Real API calls against a sandbox org
```

When adding the next product (e.g., Desk), add `src/desk/` and reuse `core/auth.ts` and `core/http.ts` unchanged.

---

## 3. Key Technical Decisions

| Decision              | Choice                                      | Rationale                                                    |
|-----------------------|---------------------------------------------|--------------------------------------------------------------|
| API version           | **v3** (not v4 beta)                        | v4 is incomplete; v3 covers all modules                      |
| Auth flow             | Server-side refresh token management        | Store refresh token in env; server auto-refreshes silently   |
| Token storage         | Environment variables                       | Never hardcode credentials                                   |
| Multi-datacenter      | Configurable via `ZOHO_REGION` env var      | Maps to correct domain prefix at runtime                     |
| Error handling        | Typed Zoho error codes → MCP error types    | Zoho returns structured errors; surface them meaningfully    |
| Rate limiting         | Built into `core/http.ts`                   | Books API has per-day/per-org call limits                    |
| Language              | TypeScript (strict mode)                    | Aligns with existing tsconfig; type safety for API contracts |
| Testing               | Unit tests with mocked HTTP; integration tests against sandbox | TDD approach per project rules             |

### Environment Variables

```
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_ORG_ID=
ZOHO_REGION=US          # US | EU | IN | AU | JP
```

---

## 4. Phase 1 — Zoho Books MCP (this repo)

### Priority MCP Tools

**Read-only (safe, high utility — implement first):**
- `list_invoices` / `get_invoice` — status, amounts, due dates, overdue detection
- `list_contacts` / `get_contact` — customer and vendor lookup
- `list_expenses` / `get_expense` — expense tracking
- `get_report` — P&L, balance sheet, cash flow, A/R aging, A/P aging
- `list_items` — product/service catalog

**Write tools (implement after read layer is stable):**
- `create_invoice` / `create_estimate`
- `create_expense`
- `create_contact`
- `record_payment`

### Implementation Steps

1. **`core/auth.ts`** — OAuth2 token manager: read refresh token from env, exchange for access token, auto-refresh on expiry, cache in memory
2. **`core/http.ts`** — Authenticated HTTP client: inject auth header, handle Zoho error responses, retry on 429, multi-DC base URL selection
3. **`core/types.ts`** — Shared TypeScript types for Zoho responses and MCP tool inputs
4. **`core/config.ts`** — Load and validate environment variables on startup
5. **`books/client.ts`** — Books API wrapper: thin typed methods around HTTP client
6. **Read tools** (`invoices.ts`, `contacts.ts`, `expenses.ts`, `reports.ts`, `items.ts`)
7. **Write tools** — create/update operations
8. **`index.ts`** — Wire up MCP server, register all tools, handle stdio transport
9. **Unit tests** — Mock HTTP layer; test every tool handler
10. **Integration tests** — Run against a Zoho Books sandbox organisation

---

## 5. Phase 2 — Additional Products

Once Books is stable, add modules reusing the `core/` layer:

| Priority | Product    | Key use cases                                      |
|----------|------------|----------------------------------------------------|
| 1        | Desk       | List/create tickets, update status, search         |
| 2        | WorkDrive  | List/upload/download files and folders             |
| 3        | Mail       | Send emails, list inbox, search                    |
| 4        | Writer     | Create/update documents                            |
| 5        | Sheets     | Read/write spreadsheet data                        |
| 6        | Bookings   | List/create appointments                           |
| 7        | Campaigns  | List campaigns, manage subscribers                 |

If server size becomes unwieldy, split into a **monorepo** (`packages/core`, `packages/books`, `packages/desk`, etc.) where each product is a standalone MCP server sharing the core package.

---

## 6. Phase 3 — Advanced Features

- **Webhooks** — Real-time event ingestion (invoice paid, ticket created)
- **Cross-product workflows** — e.g., Desk support ticket → Books invoice, Campaigns subscriber → Books contact
- **Prompt templates** — Pre-built natural language queries for common financial tasks
- **Read-only mode flag** — Env var to disable all write tools for safety

---

## 7. Development Conventions

- **TDD:** Write unit tests before implementing each tool handler
- **DRY/YAGNI:** No speculative abstractions; generalise only when patterns repeat across two or more modules
- **One responsibility per file:** Each tool file handles one Books module
- **Typed contracts:** All Zoho API request/response shapes defined as TypeScript interfaces
- **No secrets in code:** All credentials via environment variables; `.env` in `.gitignore`
- **Changelog-driven commits:** Each commit covers one logical unit (e.g., "add OAuth token manager")
