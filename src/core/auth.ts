/**
 * OAuth2 token manager: refresh on 401 (see docs/DECISIONS.md §2).
 * No expiry tracking; HTTP layer triggers refresh on 401 and retries.
 */

import { getConfig } from "./config.js";

let accessToken: string | null = null;
let refreshInFlight: Promise<string> | null = null;

/**
 * Exchange refresh token for a new access token. Updates in-memory cache.
 */
export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const config = getConfig();
    const url = `https://${config.accountsHost}/oauth/v2/token`;
    const body = new URLSearchParams({
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zoho token refresh failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error("Zoho token response missing access_token");
    }

    accessToken = data.access_token;
    return data.access_token;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Return current access token. Does not refresh; use after refreshAccessToken().
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Set access token (e.g. after refresh). Used by HTTP layer.
 */
export function setAccessToken(token: string): void {
  accessToken = token;
}
