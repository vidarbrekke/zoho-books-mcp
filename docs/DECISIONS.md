# Implementation Decisions

Each section documents a decision that required careful consideration, evaluated against **complexity**, **DRY**, **YAGNI**, and **scalability**. The chosen approach is then implemented in code.

---

## 1. Config: when to validate and how to expose

**Decision:** When should we validate environment variables (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID, ZOHO_REGION), and how should config be exposed to the rest of the app?

### Four strategies

**Strategy A — Fail at startup, single validation function**  
Validate all required env vars in one function called from the top-level (e.g. `index.ts`) before starting the MCP server. Export a `getConfig()` that reads `process.env` each time. **Complexity:** Low; one validation path. **DRY:** Good; validation lives in one place. **YAGNI:** Good; no extra abstraction. **Scalability:** Weak; every caller pays env reads and we might forget to call validation in a new entry point.

**Strategy B — Lazy per use**  
No startup validation; each module (auth, http, books) reads and validates only the vars it needs when first used. **Complexity:** Low. **DRY:** Poor; validation and defaulting duplicated at each use site. **YAGNI:** Good. **Scalability:** Poor; many modules and many vars lead to scattered, inconsistent checks and late failure.

**Strategy C — Validate at startup, frozen config object**  
On first import (or explicit `loadConfig()`), validate all required vars and build a single frozen object; export a getter that returns it. All code reads from that object. **Complexity:** Low; one module, one load. **DRY:** Good; one validation and one source of truth. **YAGNI:** Good; no extra libs. **Scalability:** Good; adding new vars or products means touching one module; no repeated env reads.

**Strategy D — Schema validator (e.g. Zod) at startup**  
Use a schema to validate and coerce env at startup; export typed config. **Complexity:** Medium; add dependency and schema definitions. **DRY:** Good. **YAGNI:** Arguably overkill for five vars. **Scalability:** Best if we later have many vars and optional/coerced values.

### Compare & choose

|            | A (startup + getConfig) | B (lazy)   | C (startup + frozen) | D (Zod)   |
|------------|--------------------------|------------|----------------------|-----------|
| Complexity | Low                      | Low        | Low                  | Medium    |
| DRY        | Good                     | Poor       | Good                 | Good      |
| YAGNI      | Good                     | Good       | Good                 | Overkill  |
| Scalability| Weak                     | Poor       | Good                 | Best      |

**Choice: C.** Fail fast at startup, single frozen config object. Keeps complexity and YAGNI in check while staying DRY and scalable. We can introduce Zod later if we need coercion or many optional vars.

### Implemented in

- `src/core/config.ts`

---

## 2. Token refresh: when to refresh the access token

**Decision:** Access tokens expire in 1 hour. Should we refresh proactively (e.g. when we know the token is about to expire) or reactively (on 401 from the API)?

### Four strategies

**Strategy A — Refresh on 401 only**  
Use the cached access token for every request; if the API returns 401, call the token endpoint with the refresh token, update cache, retry the request once. **Complexity:** Low; no clock or expiry storage. **DRY:** Good; refresh logic in one place (auth or http). **YAGNI:** Good; we don’t need to track expiry until we need it. **Scalability:** Fine for single-process; every 401 costs one extra round-trip (refresh + retry).

**Strategy B — Proactive refresh with expiry check**  
Store `access_token` and `expires_at` (e.g. `issued_at + 50 minutes`). Before each request, if `expires_at` is in the past (or within a small buffer), refresh first, then send the request. **Complexity:** Medium; must persist or compute expiry and handle clock skew. **DRY:** Good. **YAGNI:** We don’t strictly need it for Books-only; 401 refresh is enough. **Scalability:** Slightly better under high load (fewer 401s and retries).

**Strategy C — Background refresh timer**  
On startup, get token; start a timer to refresh every 50 minutes. All requests use the in-memory token. **Complexity:** Medium; timer lifecycle and process exit. **DRY:** Good. **YAGNI:** More than we need for a request-driven MCP server. **Scalability:** Good for many requests; token always fresh but adds a moving part.

**Strategy D — Hybrid: optional expiry, refresh on 401**  
Store token and optional `expires_at`. If we have expiry and it’s in the past (with buffer), refresh before the request; otherwise send. On 401, refresh and retry once. **Complexity:** Medium. **DRY:** Good. **YAGNI:** Expiry is optional; we can start without it. **Scalability:** Good; avoids most 401s when we have expiry from Zoho.

### Compare & choose

|            | A (on 401)     | B (proactive) | C (timer)   | D (hybrid)   |
|------------|----------------|---------------|-------------|--------------|
| Complexity | Low            | Medium        | Medium      | Medium       |
| DRY        | Good           | Good          | Good        | Good         |
| YAGNI      | Good           | Optional      | Overkill    | Good         |
| Scalability| Good           | Good          | Good        | Best         |

**Choice: A (refresh on 401).** Simplest and sufficient for Phase 1. No expiry parsing or timers; one place handles refresh and retry. We can add optional expiry (Strategy D) later if we see many 401s.

### Implemented in

- `src/core/auth.ts` (token fetch and cache; no expiry stored)
- `src/core/http.ts` (on 401: refresh then retry once)

---

## 3. HTTP client: retries and error shape

**Decision:** How should we handle 429 (rate limit) and non-2xx responses, and what error type should callers see?

### Four strategies

**Strategy A — No retry; throw with status and body**  
On 4xx/5xx, throw an error that includes status and parsed Zoho error body. No automatic retries. **Complexity:** Low. **DRY:** Good; error parsing in one place. **YAGNI:** Good; we can add retry when we hit rate limits. **Scalability:** Callers must implement retry if needed.

**Strategy B — Retry 429 with backoff; typed Zoho error**  
On 429, retry up to N times with exponential backoff; on other errors, throw a typed `ZohoApiError` (code, message, status). **Complexity:** Medium. **DRY:** Good; one client does retry + error mapping. **YAGNI:** Retry is useful for rate limits from day one. **Scalability:** Good; one place to tune backoff and limits.

**Strategy C — Generic fetch wrapper; retry and errors in caller**  
HTTP client only adds auth and returns raw Response; callers check status and parse body. **Complexity:** Low in client; high at every caller. **DRY:** Poor; every caller duplicates retry and error handling. **YAGNI:** Bad. **Scalability:** Poor.

**Strategy D — Full retry policy (429 + 5xx) with config**  
Retry on 429 and 5xx with configurable max retries and backoff; expose config. **Complexity:** High for Phase 1. **DRY:** Good. **YAGNI:** 5xx retry is optional for now. **Scalability:** Best long term.

### Compare & choose

|            | A (no retry)   | B (429 retry)  | C (caller)    | D (full policy) |
|------------|----------------|----------------|---------------|------------------|
| Complexity | Low            | Medium         | Low (client)  | High             |
| DRY        | Good           | Good          | Poor          | Good             |
| YAGNI      | Good           | Good          | Bad           | Overkill         |
| Scalability| Weak           | Good          | Poor          | Best             |

**Choice: B.** Retry only on 429 with simple exponential backoff; throw typed `ZohoApiError` for all errors. Balances simplicity and robustness without overbuilding.

### Implemented in

- `src/core/types.ts` (`ZohoApiError`)
- `src/core/http.ts` (429 retry + error parsing)

---

## 4. Books client: one client vs per-resource clients

**Decision:** Should the Books API be exposed as one `ZohoBooksClient` with methods like `listInvoices`, `getContact`, or as multiple clients (`InvoicesClient`, `ContactsClient`) used by the same MCP server?

### Four strategies

**Strategy A — Single client class**  
One `ZohoBooksClient` with methods for each resource: `listInvoices()`, `getInvoice()`, `listContacts()`, etc. **Complexity:** Low; one class, one instantiation. **DRY:** Good; shared base URL and HTTP. **YAGNI:** Good; we only have Books. **Scalability:** Class can grow large; we can split later by moving methods to mixins or sub-clients.

**Strategy B — Per-resource client classes**  
`InvoicesClient`, `ContactsClient`, each taking the shared `HttpClient` and org ID. MCP server constructs one per resource. **Complexity:** Medium; more files and wiring. **DRY:** Good; shared HTTP. **YAGNI:** We don’t have a second product yet; might be premature. **Scalability:** Best for very large APIs; clear boundaries.

**Strategy C — Single client with namespaced methods**  
One client, methods grouped as `client.invoices.list()`, `client.contacts.get(id)`. Same as A but with a nested object shape. **Complexity:** Medium; proxy or nested objects. **DRY:** Good. **YAGNI:** Namespacing is nice-to-have. **Scalability:** Good.

**Strategy D — Facade + internal per-resource modules**  
One public `ZohoBooksClient` that delegates to internal modules (invoices, contacts). Same external API as A; internal structure grouped by resource. **Complexity:** Medium. **DRY:** Good. **YAGNI:** Same as A from the outside. **Scalability:** Good; we can extract modules to separate files without changing the public API.

### Compare & choose

|            | A (single class) | B (per-resource) | C (namespaced) | D (facade + modules) |
|------------|------------------|------------------|----------------|----------------------|
| Complexity | Low              | Medium           | Medium         | Medium               |
| DRY        | Good             | Good             | Good           | Good                 |
| YAGNI      | Good             | Overkill         | Optional       | Good                 |
| Scalability| OK               | Best             | Good           | Good                 |

**Choice: A (single client class).** Simplest for Phase 1; one file, one class. We can refactor to D (split into `books/invoices.ts`, `books/contacts.ts` that the client imports) when the file gets too big. Don’t add per-resource client classes until we have a second product or a clear need.

### Implemented in

- `src/books/client.ts` (single `ZohoBooksClient` with flat methods)
