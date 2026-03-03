# Zoho MCP Server Design Blueprint

Generated: 2026-03-03

## Goal

Expose Zoho APIs to an MCP-compatible AI agent securely.

------------------------------------------------------------------------

## Architecture

Agent -\> MCP Server (Node/Python) -\> OAuth Layer -\> Zoho Service
Layer -\> Zoho APIs

------------------------------------------------------------------------

## Key Design Rules

1.  Centralized OAuth refresh logic
2.  Strict input validation (Zod or Pydantic)
3.  Rate limit protection
4.  Error normalization
5.  Audit logging (no secrets in logs)

------------------------------------------------------------------------

## Suggested Tool Schema Examples

### books.getInvoices

Input: - organization_id (string)

### campaigns.addContact

Input: - list_id (string) - email (string)

### bookings.createAppointment

Input: - service_id - start_time - customer_email

------------------------------------------------------------------------

## Security

-   Store refresh tokens encrypted
-   Restrict scopes per tool
-   Enforce region-specific endpoints
-   Avoid exposing raw API responses directly

------------------------------------------------------------------------

## Documentation References

Zoho OAuth: https://www.zoho.com/accounts/protocol/oauth.html

Zoho Books API: https://www.zoho.com/books/api/v3/introduction/

Zoho Campaigns: https://www.zoho.com/campaigns/help/developers/

Zoho Bookings: https://www.zoho.com/bookings/help/api/

WorkDrive: https://workdrive.zoho.com/apidocs/

ZeptoMail: https://www.zoho.com/zeptomail/help/api-home.html
