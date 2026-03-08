# Milestone A Checklist (Issue Style)

Scope: Zoho Books accounting hardening only.  
Rule: Documentation and tests/tool parity tasks only in this milestone; no product expansion yet.

Owner: New developer  
Status legend: `[ ]` todo, `[x]` done

---

## A0. Setup and Context

- [ ] Read `docs/ROADMAP.md` (Milestone A + engineering standards + tool contract conventions).
- [ ] Read `docs/DECISIONS.md` to understand current architecture choices.
- [ ] Read `README.md` and verify current documented tool list matches runtime registration in `src/index.ts`.
- [ ] Run baseline checks locally:
  - [ ] `npm test`
  - [ ] `npm run type-check`

**Acceptance**
- Baseline is green and developer understands constraints before touching files.

---

## A1. Books Accounting Surface Audit

- [ ] Confirm the following tools are present and registered in `src/index.ts`:
  - [ ] `zoho_books_list_invoices`
  - [ ] `zoho_books_get_invoice`
  - [ ] `zoho_books_list_contacts`
  - [ ] `zoho_books_get_contact`
  - [ ] `zoho_books_list_expenses`
  - [ ] `zoho_books_get_expense`
  - [ ] `zoho_books_list_bills`
  - [ ] `zoho_books_get_bill`
  - [ ] `zoho_books_list_bank_transactions`
  - [ ] `zoho_books_list_bank_accounts`
  - [ ] `zoho_books_list_items`
  - [ ] `zoho_books_get_item`
  - [ ] `zoho_books_get_report`
- [ ] Verify each tool has clear description and zod input schema.
- [ ] Verify report coverage includes:
  - [ ] `profit_and_loss`
  - [ ] `balance_sheet`
  - [ ] `cash_flow`
  - [ ] `ar_aging`
  - [ ] `ap_aging`

**Acceptance**
- Accounting tool inventory is complete and explicitly validated.

---

## A2. Input Contract Parity (List Tools)

- [ ] For every `list_*` Books tool, verify support for:
  - [ ] `page`
  - [ ] `per_page`
  - [ ] `limit` alias (`per_page ?? limit`)
  - [ ] `fields`
  - [ ] `summary`
- [ ] Ensure `summary` and `fields` are passed through the shared response shaping helpers.
- [ ] Confirm no list tool returns raw unshaped payloads unless intentional and documented.

**Acceptance**
- All list tools follow one contract style with no exceptions.

---

## A3. Error and Safety Consistency

- [ ] Verify all Books tools call `formatToolError()` for failures.
- [ ] Verify write tools still respect `ZOHO_READ_ONLY` guard (`assertWriteAllowed()` behavior intact).
- [ ] Confirm no tool logs secrets or sensitive token details.
- [ ] Confirm tool errors are understandable for MCP users (status/code/message where available).

**Acceptance**
- Error behavior is consistent, safe, and predictable across Books tools.

---

## A4. Unit Test Coverage Expansion

- [ ] Review existing test files under `tests/unit/books/` and identify gaps.
- [ ] Ensure tests exist for each accounting-critical tool family:
  - [ ] invoices
  - [ ] contacts
  - [ ] expenses
  - [ ] bills
  - [ ] bank transactions/accounts
  - [ ] reports
- [ ] For each tool family, include at least:
  - [ ] success path
  - [ ] validation/input edge path
  - [ ] upstream API error path (formatted error)
- [ ] Verify write guard test remains present for read-only mode.

**Acceptance**
- Accounting tool coverage has meaningful branch coverage, not only happy path.

---

## A5. README and Developer UX

- [x] Update `README.md` Books tool list if any mismatch remains.
- [x] Add/verify practical accounting usage examples for:
  - [x] bills list/get
  - [x] bank transaction listing
  - [x] bank account listing
  - [x] report retrieval with date range
- [x] Ensure examples use the actual tool names and field names.

**Acceptance**
- A new developer or operator can discover and use accounting tools without guessing.

---

## A6. Final Verification Gate

- [x] Run full verification before handoff:
  - [x] `npm run test`
  - [x] `npm run type-check`
- [x] Confirm no unrelated files were changed.
- [x] Prepare short changelog note for Milestone A completion.

**Acceptance**
- Milestone A is merge-ready with passing checks and scoped changes only.

---

## Handoff Template (for issue tracker)

Copy/paste this into an issue:

```md
### Milestone A: Books Accounting Hardening

#### Objective
Stabilize and standardize Zoho Books accounting tools before adding new products.

#### Done when
- Accounting tool set is complete and registered.
- List tool contract parity is enforced.
- Error handling is consistent and safe.
- Tests cover success + edge + error paths.
- README accurately documents tool behavior and examples.
- `npm test` and `npm run type-check` are green.
```

