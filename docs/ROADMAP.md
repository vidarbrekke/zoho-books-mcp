# Zoho MCP Roadmap (Execution Guide)

Last updated: 2026-03-03

This roadmap is written so a junior developer can execute milestone-by-milestone with minimal ambiguity.

Product priority (confirmed):
1. Zoho Books
2. Zoho Bookings
3. Zoho Campaigns
4. Zoho WorkDrive -> Zoho Writer -> Zoho Sheet
5. Zoho Mail (read-only first)

User constraints (confirmed):
- Skip Go migration; stay in TypeScript.
- Books focus is accounting use cases (not payments/estimates).
- Include bills and bank transactions.
- Bookings: expose all meaningful inputs for creating appointments.
- Campaigns: draft creation only in first pass.
- Drive comes before Writer/Sheet.
- Mail first version is read-only.

---

## 1) Current baseline and immediate direction

### Already in repo (Books)
- Core layer: `src/core/config.ts`, `src/core/auth.ts`, `src/core/http.ts`, `src/core/types.ts`
- Books client: `src/books/client.ts`
- Existing Books tools: invoices, contacts, expenses, items, reports, create contact/invoice
- Newly added accounting tools:
  - `zoho_books_list_bills`
  - `zoho_books_get_bill`
  - `zoho_books_list_bank_transactions`
  - `zoho_books_list_bank_accounts`
- Tests:
  - `tests/unit/books/accounting_tools.test.ts`
  - existing core/books tests

### Immediate direction
- Stabilize and complete the Books accounting surface first.
- Freeze API/tool conventions before adding new products.
- Then add products in the priority order above.

---

## 2) Engineering standards (must follow for every milestone)

1. **TDD by default**
   - Add or update tests before/alongside implementation for non-trivial behavior.
   - For each new tool: at least success path + one validation error + one upstream API error.

2. **Safety and scope**
   - Keep `ZOHO_READ_ONLY=1` default behavior unchanged.
   - Write tools must fail fast with clear error in read-only mode.

3. **No unapproved version/config churn**
   - Do not change package versions, app version, or server config unless explicitly requested.

4. **DRY/YAGNI discipline**
   - Reuse existing core utilities.
   - Extract abstractions only when duplication appears in 2+ places.

5. **Error contract consistency**
   - Continue `formatToolError()`-based normalization.
   - Avoid leaking secrets or raw auth payloads.

---

## 3) Tool contract conventions (freeze now)

Use these across all products to keep the MCP surface consistent.

### Naming
- Use product-prefixed snake_case names:
  - `zoho_books_*`
  - `zoho_bookings_*`
  - `zoho_campaigns_*`
  - `zoho_workdrive_*`
  - `zoho_writer_*`
  - `zoho_sheet_*`
  - `zoho_mail_*`

### Common input fields
- Pagination:
  - `page` (1-based)
  - `per_page` (primary)
  - `limit` alias accepted where applicable (`per_page = per_page ?? limit`)
- Projection:
  - `fields?: string[]`
- Payload reduction:
  - `summary?: boolean`

### Response shaping
- List tools: use `shapeListResponse()`
- Object tools: use `shapeObjectResponse()`
- Error formatting: use `formatToolError()`

### Validation
- Use `zod` for every tool input schema.
- Reuse shared date validators from `src/books/tools/common.ts` where possible.

---

## 4) Milestone plan

## Milestone A - Books accounting hardening (current sprint)

### Goal
Make Zoho Books robust for accounting workflows before expanding to new products.

### Scope
1. Confirm and finalize Books tools:
   - invoices: list/get
   - contacts: list/get
   - expenses: list/get
   - bills: list/get
   - bank: list transactions/accounts
   - items: list/get
   - reports: `profit_and_loss`, `balance_sheet`, `cash_flow`, `ar_aging`, `ap_aging`
2. Add missing unit tests where gaps exist (especially new tools and report variants).
3. Improve docs for accounting-oriented usage examples.

### Implementation tasks
1. **Tests first**
   - Add/extend `tests/unit/books/*` for:
     - list/get for bills
     - list bank transactions/accounts
     - report type coverage
     - read-only guard remains intact for write tools
2. **Tool parity check**
   - Verify every list tool supports `page`, `per_page`, `limit`, `fields`, `summary`.
3. **Docs**
   - Update `README.md` examples for bills/banking/report usage.

### Acceptance criteria
- `npm test` passes.
- `npm run type-check` passes.
- README accurately reflects actual tool set and parameters.

---

## Milestone B - Zoho Bookings (create-first, full input exposure)

### Goal
Ship booking creation with complete practical input coverage.

### New module structure
- `src/bookings/client.ts`
- `src/bookings/tools/create.ts`
- `src/bookings/tools/services.ts`
- `src/bookings/tools/staff.ts`
- `src/bookings/tools/appointments.ts`

### Initial tool set (in order)
1. `zoho_bookings_create_appointment` (priority #1)
2. `zoho_bookings_list_services`
3. `zoho_bookings_list_staff`
4. `zoho_bookings_list_appointments`
5. Optional follow-up:
   - `zoho_bookings_reschedule_appointment`
   - `zoho_bookings_cancel_appointment`

### Create appointment input model (expose all meaningful inputs)
The create tool should support at least:
- `service_id` (required)
- `start_time` (required, ISO datetime)
- `timezone` (required, IANA recommended)
- `staff_id` (optional unless API/service requires)
- customer identity (at least one required):
  - `customer_email`
  - `customer_name`
  - `customer_phone` (optional)
- optional metadata:
  - `notes`
  - `location_id` / `workspace_id` if Bookings model requires it
  - `custom_fields` (object passthrough)
  - `send_notifications` (boolean if supported)

Note: exact payload keys must be mapped to real Bookings API docs, not guessed.

### Critical technical requirements
- Strict datetime + timezone validation.
- Guard against ambiguous local times (DST transitions) where possible.
- Normalize Bookings API errors via existing error formatting path.

### Tests
- `tests/unit/bookings/create.test.ts`
  - required input missing -> validation error
  - success path -> shaped response
  - API 4xx/5xx -> formatted error
- Add list tool tests similarly.

### Acceptance criteria
- Booking creation works with full required input set.
- Unit tests cover all create tool branches.
- Tool registered in `src/index.ts` and documented.

---

## Milestone C - Zoho Campaigns (draft-only creation)

### Goal
Enable creating campaign drafts only (no send/schedule in first pass).

### New module structure
- `src/campaigns/client.ts`
- `src/campaigns/tools/create.ts`
- `src/campaigns/tools/lookups.ts` (only if needed for IDs)

### Initial tool set
1. `zoho_campaigns_create_draft_campaign`
2. Optional helper lookups (if required by create API):
   - `zoho_campaigns_list_topics`
   - `zoho_campaigns_list_lists`
   - `zoho_campaigns_list_templates`

### Create draft input model
- `name` / `subject` (required per API)
- `from_name`, `from_email`, `reply_to` (if required)
- audience selector (list IDs / segment IDs)
- content selector:
  - template ID or HTML content
- optional scheduling fields accepted but ignored/rejected in v1 to enforce draft-only policy

### Policy rules
- Explicitly block send/schedule operations in this milestone.
- Return clear message: "Draft created; send is not enabled in v1."

### Tests
- create draft success
- invalid audience/template validation
- attempt to pass send/schedule mode -> explicit rejection

### Acceptance criteria
- Draft creation only, no accidental send path.
- Clear docs on what is intentionally excluded.

---

## Milestone D - WorkDrive first (read-first), then Writer and Sheet

### Goal
Provide document/storage retrieval workflows with minimal risk.

### D1: WorkDrive

#### Module structure
- `src/workdrive/client.ts`
- `src/workdrive/tools/files.ts`
- `src/workdrive/tools/folders.ts`

#### Initial tools
- `zoho_workdrive_list_files`
- `zoho_workdrive_get_file_metadata`
- `zoho_workdrive_list_folders`
- `zoho_workdrive_get_folder_metadata`

Optional later:
- download link retrieval
- upload/move/share (deferred)

#### Acceptance criteria
- Reliable read/list capability for files and folders.
- Tests cover pagination and basic filtering.

### D2: Writer (after WorkDrive)

#### Module structure
- `src/writer/client.ts`
- `src/writer/tools/documents.ts`

#### Initial tools (read-only)
- `zoho_writer_list_documents`
- `zoho_writer_get_document`
- `zoho_writer_export_document` (if supported)

### D3: Sheet (after Writer)

#### Module structure
- `src/sheet/client.ts`
- `src/sheet/tools/sheets.ts`

#### Initial tools (read-only)
- `zoho_sheet_list_workbooks`
- `zoho_sheet_get_sheet_data`

### Writer/Sheet acceptance criteria
- Read-only tools functional and documented.
- No mutation tools in v1.

---

## Milestone E - Zoho Mail (read-only v1)

### Goal
Expose mailbox retrieval/search without send/reply.

### Module structure
- `src/mail/client.ts`
- `src/mail/tools/messages.ts`

### Initial tools
- `zoho_mail_list_messages`
- `zoho_mail_get_message`
- `zoho_mail_search_messages` (if practical in first pass)

### Constraints
- No send/reply/mutate behavior in v1.
- Redact/avoid sensitive body leakage in logs.

### Acceptance criteria
- Read-only retrieval working.
- Docs clearly state send is not in v1.

---

## 5) File-by-file implementation pattern (repeat for every new product)

For each product, follow this sequence:
1. Add `src/<product>/client.ts`
2. Add `src/<product>/tools/*.ts` files (one concern per file)
3. Register tools in `src/index.ts`
4. Add tests under `tests/unit/<product>/`
5. Update `README.md` tool list + examples
6. Run verification:
   - `npm test`
   - `npm run type-check`

This keeps commits small and reversible.

---

## 6) Suggested commit strategy

One logical change per commit:
1. `feat(books): add bills and banking read tools` (already done)
2. `test(books): expand accounting tool coverage`
3. `feat(bookings): add create appointment tool and validations`
4. `feat(bookings): add services/staff/appointments list tools`
5. `feat(campaigns): add draft campaign creation`
6. `feat(workdrive): add read-only file/folder tools`
7. `feat(writer): add read-only document tools`
8. `feat(sheet): add read-only workbook tools`
9. `feat(mail): add read-only message tools`

---

## 7) Risks and mitigation

1. **API variability by region/datacenter**
   - Mitigation: centralize domain mapping in `core/config` and keep product-specific base paths in each client.

2. **Undocumented/legacy endpoint differences**
   - Mitigation: start with list/get endpoints, verify with small integration checks before broadening.

3. **Timezone bugs (Bookings)**
   - Mitigation: validate ISO datetime + timezone strictly and add DST-edge tests.

4. **Overexposing write operations**
   - Mitigation: read-only defaults and explicit v1 exclusions.

5. **Contract drift between products**
   - Mitigation: enforce naming/pagination/shape conventions from section 3.

---

## 8) Definition of done (project-level)

The roadmap is considered complete when:
1. All five prioritized product groups are implemented at their defined v1 scope.
2. Every tool has unit test coverage for success + validation + API error path.
3. README and docs match runtime behavior exactly.
4. Type-check and tests are green.
5. No unapproved dependency/version/config changes were introduced.

