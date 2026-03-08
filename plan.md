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

## 2.5 Go-Inspired Runtime Pattern Additions

### Why these are useful now

The Go `gogcli` MCP runtime has durable patterns for large tool surfaces. These are high-signal ideas to avoid refactor pain as Zoho expands beyond Books.

### A. Tool spec registry and execution envelope

- Introduce a shared `ToolSpec` with:
  - `name`, `description`, `inputSchema`, `tier`, `version`, `policyClass`, `handler`
- Add registry methods:
  - `registerToolSpec(spec)`
  - `registerTool(name, handler)` for compact handlers
  - `listToolSpecs()` (sorted, deterministic output)
  - `executeTool(name, input)` returning a standardized envelope.
- Standardize handler returns to `{ ok, service, operation, result, error }` to reduce bespoke parsing.

### B. Error normalization and reusable codes

- Add a central error model for MCP tool execution:
  - `invalid_argument`, `not_found`, `permission_denied`, `rate_limited`, `unavailable`, `internal_error`, `api_error`.
- Always return operation/service context even on failure.
- Keep stderr-style text outputs as a compatibility layer, but prefer structured envelopes for clients.

### C. MCP transport hardening

- Add scanner/stream guardrails:
  - larger message cap for tool payloads,
  - bounded in-flight requests,
  - bounded response queue.
- Under pressure, return a controlled `resource_exhausted` response instead of dropping work.

### D. Transport- and service-level metadata

- Keep `service`, `operation`, and `opId` on all responses.
- Include `tier`/`policyClass` in tool listing so callers can adapt their usage strategy.
- Optional request flags: `timeoutMs`, `retries`, `retryBackoffMs`, `opId`.

### E. Auth and secret storage evolution

- Keep env as baseline for deploys, but add pluggable token storage later:
  - file-backed encrypted store and OS keychain (where available),
  - optional backend override by env.
- Preserve simple path for now (single token source), but define abstractions now so multi-account/client onboarding is incremental.

### F. HTTP resilience layer

- Expand `core/http.ts` into a shared policy module:
  - retry on 429 with header/backoff,
  - retry limited 5xx,
  - optional circuit-breaker guard for repeated outages,
  - strict JSON parsing and mapped error envelope.

### G. CLI-like handler ergonomics without CLI rewrite

- Add small helpers for shared argument normalization (`asInt`, `asBool`, alias handling, trimming, page-size caps).
- Validate required params centrally in each handler and return `invalid_argument` consistently.
- Keep command-specific logic explicit; avoid hidden implicit behavior.

### H. Debug observability

- Add optional debug logging hook (`ZOHO_MCP_DEBUG_LOG`) that emits parse/execution breadcrumbs per request.
- Capture op-id correlation for easier post-mortem tracing.

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

1. **`core/config.ts`** — Load and validate environment variables on startup
2. **`core/auth.ts`** — OAuth2 token manager: read refresh token from env, exchange for access token, auto-refresh on expiry, cache in memory
3. **`core/http.ts`** — Authenticated HTTP client: inject auth header, handle Zoho error responses, retry policy, multi-DC base URL selection
4. **`core/types.ts`** — Shared TypeScript types for Zoho responses and MCP tool inputs
5. **`mcp/tool.ts` + `mcp/server.ts`** — ToolSpec registry, execution envelope, and error normalization
6. **`mcp/transport.ts`** — Concurrency-safe stdio transport behavior and deterministic tool/list payloads
7. **`books/client.ts`** — Books API wrapper: thin typed methods around HTTP client
8. **Read tools** (`invoices.ts`, `contacts.ts`, `expenses.ts`, `reports.ts`, `items.ts`)
9. **Write tools** — create/update operations, with validation and safe defaults
10. **`index.ts`** — Compose modules only; register all tool specs and start transport
11. **`mcp/debug.ts`** — Optional debug logging + request correlation IDs
12. **Unit tests** — Mock HTTP layer; test registry/transport/error behavior and every tool handler
13. **Integration tests** — Run against a Zoho Books sandbox organisation

---

## 4.1 Implementation Playbook (10x Execution — Strategy 2)

Use this as a day-by-day execution path, using only the contract-first incremental approach.

### Global guardrails (Strategy 2)

- Do an abstraction only when it removes repetition in at least two current or planned places.
- Keep behavior unchanged for existing tools unless a test explicitly allows a change.
- Add tests with each step before moving to the next step.
- Prefer small, pluggable seams over broad backends or platform-specific implementations.
- Defer speculative improvements (keychain, circuit breaker, and full orchestration) to later phases unless they block current work.

### Track A — Runtime Foundation (highest impact, low coupling)

1. **Build MCP schema contract first**
   - Create `src/mcp/types.ts`, `src/mcp/tool.ts`, `src/mcp/server.ts`.
   - Add `ToolSpec`, `ToolInputSchema`, `Envelope`, `ErrorEnvelope`, and `ErrorCode` exports.
   - Add deterministic registry methods:
     - `registerToolSpec(spec)`
     - `registerTool(name, handler)`
     - `listToolSpecs()`
     - `executeTool(name, input)`
   - **Acceptance:**
     - Registry unit tests cover register/list/execute, not-found, and malformed input.
     - No production tool logic is changed yet; this is contract scaffolding only.

2. **Introduce common error taxonomy**
   - Create `src/mcp/errors.ts` and a shared `toErrorPayload` helper.
   - Include only the codes needed by current flows:
     - `invalid_argument`, `not_found`, `permission_denied`, `rate_limited`, `unavailable`, `internal_error`, `api_error`, `resource_exhausted`.
   - **Acceptance:**
     - Existing handlers can adopt shared helpers without changing tool behavior.
     - Error codes are consistent across `list/get` tools.

3. **Add resilient MCP transport with bounded concurrency**
   - Create `src/mcp/transport.ts` and enforce:
     - larger read/scan limit than current default,
     - bounded in-flight request cap,
     - bounded response queue,
     - backpressure error (`resource_exhausted`) on overflow.
   - Keep protocol behavior unchanged (`initialize`, `tools/list`, `tools/call` framing and IDs).
   - **Acceptance:**
     - Targeted concurrent-call test returns all responses under cap and drops none.
     - Above-cap request returns `resource_exhausted` envelope.

4. **Attach operation metadata at tool boundary**
   - Add `tier`, `version`, `policyClass` into `tools/list`.
   - Ensure envelopes include `service`, `operation`, `opId` when provided.
   - **Acceptance:**
   - `tools/list` includes metadata for every registered tool.
   - `tools/call` returns metadata consistently across read tools.

### Track B — Stability and resilience (hardening)

5. **Upgrade HTTP layer into policy-driven client**
   - Extend `src/core/http.ts` with:
     - timeout guard,
     - 429 retry with backoff + `Retry-After`,
     - limited 5xx retry,
     - structured error envelope mapping.
   - Defer circuit-breaker and long-tail heuristics to a later strategy-2 wave.
   - **Acceptance:**
     - Unit tests assert retry and non-retry branches.
     - Error payload is always normalized to status/code/message.

6. **Add auth/token abstraction seam now**
   - Refactor `src/core/auth.ts` behind an internal token-provider interface.
   - Keep env-based provider as first implementation and default.
   - **Acceptance:**
   - Env auth behavior is unchanged.
   - A second provider can be dropped in by wiring a different resolver.

7. **Add debug hooks and op-id traceability**
   - Add `src/mcp/debug.ts` with optional `ZOHO_MCP_DEBUG_LOG` structured event output.
   - Propagate `opId` from request to envelope and debug record.
   - **Acceptance:**
   - `initialize`, `tools/list`, and `tools/call` are logged when debug log is enabled.
   - `opId` is present in both log and response envelope.

### Track C — Product delivery (Books, then extension)

8. **Migrate current Books tools to registry**
   - Migrate `src/books/tools/*.ts` to `ToolSpec` + `Envelope` shape.
   - Add helpers only where they are reused by at least 2 handlers.
   - Standardize malformed input to `invalid_argument`.
   - **Acceptance:**
   - `list_invoices`, `get_invoice`, `list_contacts`, `get_contact`, `list_expenses`, `get_expense`, `get_report`, `list_items`,
     `create_contact`, `create_invoice` pass existing and new tests with consistent envelope output.

9. **Refactor `src/index.ts` to composition root only**
   - `index.ts` should load config, wire modules, then start transport.
   - Remove duplicate registration logic from startup path.
   - **Acceptance:**
   - Tool registration order remains stable.
   - Startup semantics unchanged for initialize/tools/list.

10. **Acceptance gate for Phase 1**
    - Run `yarn test` (unit + transport boundary + new concurrency test).
    - Run a short integration smoke against sandbox-like fixtures or environment.
    - Verify checklist tools are callable in OpenClaw-style request flow.
    - Verify read-only mode toggles via env without branching in handler code.

### Track D — Rollout sequence and risk control

11. **Execution order (recommended)**
    - Track A (1-4) -> Track B (5-7) -> Track C (8-10).
    - Pause after each numbered item for a green test checkpoint.
    - If a step regresses, keep prior working layers and revert only that module.

12. **Definition of Done (Phase 1 complete)**
    - A/B infrastructure complete, tested, and in production use.
    - All planned read tools and initial write tools are registered through the registry.
    - Deterministic envelopes and metadata are stable for OpenClaw compatibility.
    - A5/A6 OpenClaw-readiness checks can be completed without modifying transport internals.

### Strategy-2 deferment list (later phases)

- Keyring/secret backends (env-only remains default for Phase 1).
- Full circuit-breaker implementation and heavy adaptive throttling.
- Cross-product orchestration scaffolding beyond Books module onboarding.

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

---

## 8. Strategy-2 Execution Ticket Board (12 Items)

Use this for day-level execution. Keep each ticket as a small, reversible change.

| ID | Owner | Scope | Test | Pass / Fail Criteria | Rollback Point |
|----|-------|-------|------|----------------------|----------------|
| P1-T1 | Dev/Agent | `src/mcp/types.ts`, `src/mcp/tool.ts`, `src/mcp/server.ts` (add core MCP types + registry contract scaffolding) | `yarn test` (new `tests/unit/mcp/registry.test.ts`) | Pass if `registerToolSpec`, `registerTool`, `listToolSpecs`, `executeTool` are covered and deterministic list order is stable | Revert `src/mcp/*` changes and tests for this ticket only |
| P1-T2 | Dev/Agent | `src/mcp/errors.ts` + existing handlers | `yarn test` (new `tests/unit/mcp/errors.test.ts`) | Pass if shared error codes (`invalid_argument`, `not_found`, `permission_denied`, `rate_limited`, `unavailable`, `internal_error`, `api_error`, `resource_exhausted`) are generated through one helper path | Remove `src/mcp/errors.ts`, restore previous inline error objects |
| P1-T3 | Dev/Agent | `src/mcp/transport.ts` (bounded in-flight + response queue + scanner cap) | targeted concurrency test in `tests/unit/mcp/transport.test.ts` | Pass if 20 parallel calls return 20 valid responses and overflow returns `resource_exhausted` | Replace transport with current implementation and retarget call site in `src/index.ts` only |
| P1-T4 | Dev/Agent | `src/mcp` list payload + envelope shape (`tools/list`, handler responses) | `yarn test` (existing + new metadata assertions) | Pass if every tool spec includes `tier/version/policyClass` and all envelopes include `service` + `operation` + optional `opId` | Revert `listToolSpecs` and handler envelope output to pre-ticket shape |
| P1-T5 | Dev/Agent | `src/core/http.ts` (retry and timeout policy + error mapping) | `yarn test` (new `tests/unit/core/http.test.ts`) | Pass if 429 + Retry-After and 5xx retry are tested; non-retryable 4xx returns one attempt with normalized payload | Revert `src/core/http.ts` to previous function and restore tests to previous baseline |
| P1-T6 | Dev/Agent | `src/core/auth.ts` (internal `TokenProvider` interface + env provider default) | `yarn test` (new `tests/unit/core/auth.test.ts`) | Pass if env auth behavior remains unchanged and provider can be swapped in tests via resolver seam | Restore `src/core/auth.ts` pre-ticket and revert new seams in call sites |
| P1-T7 | Dev/Agent | `src/mcp/debug.ts` (`ZOHO_MCP_DEBUG_LOG` + opId propagation) | `yarn test` (new `tests/unit/mcp/debug.test.ts`) | Pass if enabled logging writes initialize/list/call events and includes `opId` | Remove debug module and keep startup path unchanged |
| P1-T8 | Dev/Agent | `src/books/tools/invoices.ts`, `src/books/tools/contacts.ts`, `src/books/tools/expenses.ts`, `src/books/tools/reports.ts`, `src/books/tools/items.ts` | `yarn test` + all existing Books tests | Pass if all read tools return standardized envelopes and malformed input maps to `invalid_argument` via shared helper path | Revert individual tool files to pre-migration versions, keep transport+core unchanged |
| P1-T9 | Dev/Agent | `src/books/tools/invoices.ts`, `src/books/tools/contacts.ts`, `src/books/tools/expenses.ts`, `src/books/tools/reports.ts`, `src/books/tools/items.ts` (write handlers if present) | `yarn test` (new/updated tests for write paths) | Pass if write tools (`create_contact`, `create_invoice`, `create_expense`) use same validation/error envelope and preserve existing behavior | Revert write tool changes only and keep registry tests in place |
| P1-T10 | Dev/Agent | `src/index.ts` (composition root cleanup) | startup smoke: `node dist/index.js` with initialize + tools/list | Pass if startup and tool discovery are unchanged from baseline except registry-driven metadata | Replace `index.ts` with prior wiring block and re-run baseline sanity |
| P1-T11 | Dev/Agent | `src/core/types.ts`, `src/index.ts`, `src/core/config.ts`, `src/core/auth.ts`, `src/core/http.ts` (final integration) | `yarn test`, env matrix smoke (`read-only` on/off) | Pass if read-only is config-driven only and no handler-specific branching is needed | Revert only config/env read behavior introduced in this ticket |
| P1-T12 | Dev/Agent | `README.md`, `docs/OPENCLAW_READINESS.md`, milestone-facing notes | checklist verification runbook | Pass if all Phase 1 checklist items A4-A6 can be marked complete without transport internals edits | Restore docs to last accepted milestone version |

### Ticket execution sequence (strict)

- T1 → T4 first (runtime contract + errors + transport + metadata)
- T5 → T7 next (stability + observability)
- T8 → T11 next (Books migration + composition + acceptance checks)
- T12 last (documentation and milestone closure)
