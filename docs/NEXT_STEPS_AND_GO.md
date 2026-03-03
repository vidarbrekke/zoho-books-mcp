# Next Steps & Go Consideration

Suggestions for evolving zoho-books-mcp, with the [gogcli-enhanced](/Users/vidarbrekke/Dev/gogcli-enhanced) (Google Drive/Docs) solution as a reference.

---

## 1. Next steps (current TypeScript server)

### From `plan.md` — still to do

- **Phase 1 (Books):**
  - **Payments:** `record_payment` (customer/vendor) and list/get payment tools.
  - **Estimates / Sales orders:** `list_estimates`, `get_estimate`, `create_estimate`; optional sales-order tools if useful.
  - **Reports:** Extend `get_report` for more report types (e.g. A/P aging) if the API supports them.
- **Phase 2 (next product):** Add one more Zoho product reusing `core/` (auth, http, config). Plan suggests **Desk** (tickets) or **WorkDrive** (files) as first; same OAuth, new base URL and scopes.
- **Phase 3:** Webhooks, cross-product workflows, prompt templates — defer until at least one extra product is in place.

### Quick wins

- **Cursor MCP config:** Document using the secrets file path so Cursor can point `env` at a script that loads `~/.openclaw/secrets/zoho-books-mcp.json` (no secrets in JSON).
- **Integration tests:** Add a small integration test suite (e.g. `tests/integration/`) that runs against a sandbox org when env is set; skip in CI without credentials.
- **Tool schema consistency:** Align tool naming and input schemas with a simple convention (e.g. `zoho_books_*` already used; keep one style for pagination: `page`, `page_size` or `limit`).

---

## 2. What to borrow from gogcli-enhanced

Use these as **design patterns**, independent of language:

| Pattern | gogcli approach | Apply in zoho-books-mcp |
|--------|------------------|--------------------------|
| **Tool naming** | `service.operation` (e.g. `docs.planBatch`, `drive.ensureFolder`) | You already use `zoho_books_*`; keep one namespace and stick to it. |
| **Plan/execute** | Separate tools: `docs.planBatch` (validate-only) and `docs.executeBatch` | For heavier write flows (e.g. batch invoice create), consider a "plan" tool that returns a request hash and an "execute" tool that takes it. |
| **Envelope / errors** | Stable envelope: `service`, `operation`, `opId`, `requestHash`; typed error codes | Add optional `opId` / `requestHash` in tool results for replay and debugging. |
| **Large payloads** | stdio scanner buffer raised (e.g. 10MB) so big tool payloads don't drop the connection | If you see truncation or drops on large requests, increase buffer limits in the MCP transport. |
| **Isolated execution** | MCP runs tools in a subprocess; stdout/stderr don't mix with JSON-RPC | In Node you already get one process; if you later add CLI-style tools, run them in a child process and capture stdout/stderr. |
| **Read-only / safety** | `--readonly` and scoped commands | You already have `ZOHO_READ_ONLY`; keep it and document it in README/tool descriptions. |

You don't need to rewrite in Go to adopt these; they can be applied in TypeScript incrementally.

---

## 3. Using Go for the MCP server

### Why consider Go

- **Single binary:** No `node`/`npm` on the path for Cursor/Claude; easier deployment and fewer version issues.
- **Performance / startup:** Fast startup and low memory; good for a long-lived MCP process.
- **Ecosystem:** Official MCP Go SDK ([modelcontextprotocol/go-sdk](https://github.com/modelcontextprotocol/go-sdk)) supports stdio and tools; gogcli shows a custom JSON-RPC stdio layer that's also viable.
- **Consistency:** If you standardize on Go for "MCP + API" tools (like gogcli), one language for this family of servers.

### Why stay with TypeScript

- **Already working:** Current server is small, tested, and integrated; no need to change for its own sake.
- **Faster iteration:** Your plan emphasizes TDD and small steps; TS + existing tests give quick feedback.
- **Zoho SDK / examples:** More Zoho examples and docs use REST/curl; language-agnostic. No strong pull toward Go from the Zoho side.

### If you add a Go version

- **Option A — New Go server (recommended):** Add a `server-go/` (or separate repo) that implements the same MCP tool list. Use the **official MCP Go SDK** (`github.com/modelcontextprotocol/go-sdk`) and stdio transport. Share only the "contract" (tool names, input/output schemas, env vars). Keeps the TS server as reference and allows gradual migration or side-by-side use.
- **Option B — Full rewrite:** Replace the TS codebase with a single Go server. Only do this if you want to commit to Go and are ready to re-run tests and Cursor/Claude integration.
- **gogcli-style custom MCP:** gogcli does **not** use the official SDK; it implements JSON-RPC over stdio and a small tool server. You can do the same in Go for full control, but for a new server the official SDK is simpler unless you need gogcli-specific behavior (e.g. subprocess executor with isolated stdout).

### Minimal Go MCP server (official SDK)

```go
// Example shape only — not runnable without deps
package main

import (
    "context"
    "log"
    "github.com/modelcontextprotocol/go-sdk/mcp"
)

func main() {
    server := mcp.NewServer(&mcp.Implementation{Name: "zoho-books-mcp", Version: "0.1.0"}, nil)
    // Register tools (zoho_books_list_invoices, etc.) here
    if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
        log.Fatal(err)
    }
}
```

Then implement each tool as a handler that loads config (env or secrets file), calls Zoho Books API (with a small HTTP client + OAuth), and returns JSON. Reuse the same env vars and secrets layout as the TS server so Cursor config stays the same.

---

## 4. Recommended order

1. **Short term:** Stay on TypeScript. Finish Phase 1 (payments, estimates if needed), add integration tests and secrets-based Cursor config. Optionally add envelope fields (`opId`, `requestHash`) for key tools.
2. **Next product:** Add one more Zoho product (e.g. Desk or WorkDrive) in TS using existing `core/` to validate the multi-product design.
3. **Go decision:** If you want a single binary and are happy to maintain Go, introduce a parallel Go server that matches the current tool contract and run both for a while; then either retire the TS server or keep both for different environments.

Using gogcli-enhanced as a reference is most valuable for **conventions** (naming, plan/execute, envelopes, safety) and **operational details** (stdio buffer size, isolated execution). The language choice can stay TypeScript unless you explicitly want to move to Go for deployment or consistency reasons.
