# Unified Zoho OpenAPI-Style Reference

Generated: 2026-03-03

## Overview

This document outlines a unified, service-oriented structure for
integrating: - Zoho Books - Zoho Bookings - Zoho Campaigns - Zoho
WorkDrive - ZeptoMail

Base OAuth Authority: https://accounts.zoho.com

------------------------------------------------------------------------

## Authentication (OAuth2)

Token Endpoint: https://accounts.zoho.com/oauth/v2/token

Authorization Endpoint: https://accounts.zoho.com/oauth/v2/auth

Grant Types: - authorization_code - refresh_token

Required Parameters: - client_id - client_secret - redirect_uri - scope

------------------------------------------------------------------------

# Zoho Books (v3)

Base URL: https://www.zohoapis.com/books/v3

Common Endpoints: GET /invoices POST /invoices GET /contacts POST
/contacts GET /items

Requires: - organization_id query parameter - OAuth scope: ZohoBooks.\*

Docs: https://www.zoho.com/books/api/v3/introduction/

------------------------------------------------------------------------

# Zoho Bookings

Base URL: https://www.zohoapis.com/bookings/v1

Common Endpoints: POST /appointments GET /appointments PUT
/appointments/`<built-in function id>`{=html} DELETE
/appointments/`<built-in function id>`{=html}

Docs: https://www.zoho.com/bookings/help/api/

------------------------------------------------------------------------

# Zoho Campaigns

Base URL: https://campaigns.zoho.com/api

Key Operations: - Add Contact - Create Campaign - Send Campaign - Get
Reports

Docs: https://www.zoho.com/campaigns/help/developers/

------------------------------------------------------------------------

# Zoho WorkDrive

Base URL: https://www.zohoapis.com/workdrive/api/v1

Common Operations: - Upload file - Download file - List folders - Share
file

Docs: https://workdrive.zoho.com/apidocs/

------------------------------------------------------------------------

# ZeptoMail (Transactional Email)

Base URL: https://api.zeptomail.com/v1.1

Operations: POST /email

Docs: https://www.zoho.com/zeptomail/help/api-home.html
