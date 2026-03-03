# Node.js Zoho Integration Starter Template

Generated: 2026-03-03

## Dependencies

npm install axios dotenv

## .env

CLIENT_ID=your_client_id CLIENT_SECRET=your_client_secret
REFRESH_TOKEN=your_refresh_token

## oauth.js

``` js
const axios = require("axios");

async function refreshAccessToken() {
  const response = await axios.post(
    "https://accounts.zoho.com/oauth/v2/token",
    null,
    {
      params: {
        refresh_token: process.env.REFRESH_TOKEN,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "refresh_token"
      }
    }
  );
  return response.data.access_token;
}

module.exports = { refreshAccessToken };
```

## booksClient.js

``` js
const axios = require("axios");
const { refreshAccessToken } = require("./oauth");

async function getInvoices(orgId) {
  const token = await refreshAccessToken();
  const res = await axios.get(
    "https://www.zohoapis.com/books/v3/invoices",
    {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      params: { organization_id: orgId }
    }
  );
  return res.data;
}

module.exports = { getInvoices };
```
