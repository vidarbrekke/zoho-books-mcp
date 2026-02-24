# Session code review: secrets, OAuth, security

Review of changes made in this session (OPENCLAW_SECRETS_DIR, secret-scan, oauth-setup, token 0600, SECURITY.md).

---

## 1. Objectives: logic, edge cases, performance, technical debt

### Logic

- **Config:** File-first then env overlay is consistent. `requireEnv` and `parseReadOnly` behave as intended. Cache is cleared in tests. No flaws found.
- **OAuth script:** `findFreePort` tries ports sequentially and resolves with the first that listens. Code → token exchange → write file chain is correct. Single-flight not needed (one-off script).
- **Secret scan:** Walk skips `tests` and `docs`; patterns target literal assignments with long values. No logic bugs.

### Edge cases (validated)

1. **OAuth callback HTML injection**  
   In `oauth-setup.js`, the `error` query param is interpolated into HTML without escaping. If Zoho (or a malicious redirect) sent `?error=<script>...` or `?error=" onload=...`, the local callback page could execute script. **Impact:** Low (local, one-time page). **Fix:** Escape HTML in the error fragment (validated fix).

2. **OAuth code never received**  
   If the user never visits the callback (closes browser, wrong URL), `codePromise` never resolves and the process hangs. **Fix:** Add a timeout (e.g. 10 minutes) so the script exits with a clear message (validated fix).

3. **Secrets file permissions**  
   `ensureFileMode` catches all errors and continues. If `chmod` fails (e.g. permission denied), we keep running with an overly permissive file. **Assessment:** Intentional “best effort” repair; no change unless we add a warning log (optional, not required).

### Performance

- **Config:** One-time load; `loadSecretsFile` and `ensureFileMode` are sync and acceptable at startup.
- **Secret scan:** Sync file walk and regex over text files; fine for CI/pre-commit.
- **OAuth:** Single token exchange and file write. No issues.

### Technical debt

- **Duplication:** `REGIONS`, `ACCOUNTS_HOST`, `getSecretsDir`, `SECRETS_FILENAME` exist in both `src/core/config.ts` and `scripts/oauth-setup.js`. The script is standalone (no build); sharing would require either building first or a shared JSON file. Debt is small and contained; acceptable for now (YAGNI).

---

## 2. Refactoring strategies (4 options)

### Strategy A — Shared region/accounts config (e.g. JSON)

- **Idea:** Put regions and accounts hosts in `scripts/zoho-regions.json`; have config.ts and oauth-setup.js read it.
- **Cognitive:** Single source of truth; one place to add regions.
- **Performance:** One extra read at startup; negligible.
- **DRY:** Removes duplication.
- **YAGNI:** We rarely add regions; only two consumers.
- **Scalability:** Helps if more scripts need region data.
- **Automation:** No impact.
- **Verdict:** Not chosen. Adds indirection and a new artifact for limited benefit; don’t over-engineer.

### Strategy B — Harden OAuth callback (escape HTML + timeout)

- **Idea:** Escape `error` when rendering the callback HTML; add a 10-minute timeout to `codePromise`.
- **Cognitive:** Clear security and UX behavior.
- **Performance:** Negligible.
- **DRY/YAGNI:** N/A.
- **Validated:** Addresses real edge cases (XSS in callback, hanging process).
- **Verdict:** Chosen. Small, targeted, no over-engineering.

### Strategy C — Log or surface chmod failures in ensureFileMode

- **Idea:** In `config.ts`, log a warning (or rethrow) when `chmodSync` fails in `ensureFileMode`.
- **Cognitive:** Makes permission failures visible.
- **Performance:** Negligible.
- **Validated:** Current “ignore” behavior is intentional; no proven bug.
- **Verdict:** Not applied. Would add logging without a validated requirement; leave as-is.

### Strategy D — Leave duplication as-is

- **Idea:** No shared constants; keep REGIONS/ACCOUNTS_HOST/getSecretsDir in both config and oauth-setup.
- **Cognitive:** No extra indirection; script stays obvious and runnable without build.
- **YAGNI:** Only two places; script is standalone.
- **Verdict:** Accept. Explicitly chosen over Strategy A to avoid over-engineering.

---

## 3. Recommendation and fix

- **Compare / select:** Strategy B is the only one that fixes validated issues (callback XSS risk, hang). A, C, D either add complexity without clear need or don’t address a proven problem.
- **Apply:** Implement Strategy B: escape HTML for the OAuth `error` param and add a 10-minute timeout around the code-receiving promise.

---

## 4. Validation

- **OAuth HTML:** Zoho can send `error` in the redirect URL; we render it in `res.end(...)`. Escaping prevents any HTML/script in that param from executing. **Validated.**
- **Timeout:** If the user never hits the callback, the promise never resolves. A timeout that rejects after 10 minutes is a standard pattern for local OAuth flows. **Validated.**
- No changes made for unvalidated assumptions (e.g. chmod logging, shared JSON).

---

## 5. Summary

- **Applied:** OAuth callback HTML escaping + 10-minute timeout in `scripts/oauth-setup.js`.
- **Not applied:** Shared region config (YAGNI), chmod logging (not required), any other speculative refactors.
- **Principle:** Don’t over-engineer; only fix validated issues.
