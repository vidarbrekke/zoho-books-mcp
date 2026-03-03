This document summarizes official developer resources for integrating with the following Zoho applications:
	•	Zoho Books
	•	Zoho Bookings
	•	Zoho Campaigns
	•	Zoho Docs (and successors)
	•	Zoho Mail

It also includes authentication notes and architectural considerations.

⸻

1. Core Zoho Developer Platform

Zoho provides a centralized developer platform for OAuth setup, app registration, and API access across products.

Developer Console

https://api-console.zoho.com/

Use this to:
	•	Register client applications
	•	Generate Client ID / Client Secret
	•	Configure redirect URIs
	•	Manage OAuth scopes

Zoho REST API Overview

https://www.zoho.com/developer/rest-api.html

Most Zoho apps use:
	•	OAuth 2.0
	•	Access + Refresh tokens
	•	Region-based domains (US, EU, IN, etc.)
	•	JSON REST endpoints

⸻

2. Zoho Books

Zoho Books provides a comprehensive REST API (v3).

API Documentation

https://www.zoho.com/books/api/v3/introduction/

What You Can Do
	•	Manage invoices
	•	Create and update contacts
	•	Manage items
	•	Record expenses
	•	Handle payments
	•	Retrieve reports

Notes
	•	Requires organization ID in requests
	•	OAuth scopes must include Books permissions
	•	Rate limits apply
	•	Supports OpenAPI definitions for SDK generation

⸻

3. Zoho Bookings

Zoho Bookings exposes REST endpoints for appointment management.

API Documentation

https://www.zoho.com/bookings/help/api/

Common Use Cases
	•	Create appointment
	•	Retrieve appointment details
	•	Reschedule appointment
	•	Cancel appointment
	•	Retrieve services and staff

Notes
	•	Uses OAuth
	•	Multi-location and multi-staff models must be handled carefully
	•	Time zone handling is critical

⸻

4. Zoho Campaigns

Zoho Campaigns supports email marketing automation via API.

Developer Documentation

https://www.zoho.com/campaigns/help/developers/

Key API Areas
	•	Mailing list management
	•	Contact subscription
	•	Campaign creation
	•	Campaign scheduling
	•	Reports and analytics

Notes
	•	API keys may be used in addition to OAuth
	•	Useful for syncing ecommerce subscribers
	•	Good candidate for webhook-based automation

⸻

5. Zoho Mail

Zoho Mail does not expose a traditional REST API for full inbox control in the same way as Books or Campaigns.

Options Available

IMAP / SMTP

Standard protocols supported for:
	•	Sending mail
	•	Receiving mail
	•	Managing folders

ZeptoMail (Transactional Email API)

Recommended for programmatic email sending.

Documentation:
https://www.zoho.com/zeptomail/help/api-home.html

Use ZeptoMail for:
	•	Transactional emails
	•	Templates
	•	Analytics
	•	Delivery tracking

⸻

6. Zoho Docs (Deprecated) and Successors

Zoho Docs as a standalone product does not provide a strong public REST API comparable to Google Drive.

Recommended Replacement: Zoho WorkDrive

WorkDrive API:
https://workdrive.zoho.com/apidocs/

Use for:
	•	File storage
	•	Folder management
	•	Upload / download
	•	Sharing controls

Office Integrator API

For embedding document editing or viewing in apps:

https://www.zoho.com/officeintegrator/developer.html

⸻

7. Authentication Overview

Most Zoho APIs use OAuth 2.0.

OAuth Guide

https://www.zoho.com/accounts/protocol/oauth.html

Flow Overview
	1.	Register app in Developer Console
	2.	Redirect user to Zoho authorization URL
	3.	Exchange authorization code for access token
	4.	Store refresh token securely
	5.	Refresh access tokens as needed

Important Considerations
	•	Tokens are region-specific
	•	APIs are region-specific
	•	Store refresh tokens securely
	•	Scope must be declared at authorization time

⸻

8. Architectural Considerations

If integrating multiple Zoho products:
	•	Centralize OAuth handling
	•	Abstract per-service clients
	•	Handle rate limiting gracefully
	•	Use retry with exponential backoff
	•	Cache organization IDs and metadata
	•	Design around region-based endpoints

If building an MCP server or agent integration:
	•	Create a service layer per Zoho app
	•	Keep token refresh isolated
	•	Validate inputs before API calls
	•	Log request IDs for traceability

⸻

9. Recommended Integration Strategy

If building a backend integration:
	1.	Start with OAuth integration
	2.	Build Books client (often most structured API)
	3.	Add Campaigns sync if email marketing required
	4.	Use ZeptoMail for transactional email
	5.	Replace Zoho Docs usage with WorkDrive