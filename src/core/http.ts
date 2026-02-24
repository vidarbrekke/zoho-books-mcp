/**
 * Authenticated HTTP client: inject auth, retry on 429 (prefer Retry-After), 25s timeout, throw ZohoApiError.
 * See docs/DECISIONS.md §2 (refresh on 401) and §3 (429 retry + error shape).
 */

import { refreshAccessToken, getAccessToken, setAccessToken } from "./auth.js";
import { getConfig } from "./config.js";
import { ZohoApiError } from "./types.js";

const MAX_429_RETRIES = 3;
const INITIAL_429_DELAY_MS = 1000;
const MAX_5XX_RETRIES = 1;
const REQUEST_TIMEOUT_MS = 25_000;

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds * 1000);
  }
  const dateMs = Date.parse(headerValue);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - Date.now());
}

async function parseErrorResponse(res: Response): Promise<{ code?: number; message: string; details?: Record<string, unknown> }> {
  let message = `HTTP ${res.status}`;
  let code: number | undefined;
  let details: Record<string, unknown> | undefined;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await res.json()) as { code?: number; message?: string; details?: Record<string, unknown> };
      code = body.code;
      if (body.message) message = body.message;
      details = body.details;
    } catch {
      // ignore
    }
  }

  return { code, message, details };
}

/**
 * Request with auth header. On 401: refresh token, set new token, retry once.
 * On 429: retry with exponential backoff up to MAX_429_RETRIES.
 */
export async function zohoFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = getConfig();
  const baseUrl = `https://${config.apiHost}`;
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

  let lastError: ZohoApiError | null = null;

  const doOne = async (retryCount = 0, hasRetried401 = false): Promise<Response> => {
    let token = getAccessToken();
    if (!token) {
      token = await refreshAccessToken();
      setAccessToken(token);
    }

    const headers: Record<string, string> = {
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    };
    if (options.body !== undefined && headers["Content-Type"] === undefined) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401 && !hasRetried401) {
      const token2 = await refreshAccessToken();
      setAccessToken(token2);
      return doOne(retryCount, true);
    }

    if (res.status === 429 && retryCount < MAX_429_RETRIES) {
      const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
      const delay =
        retryAfterMs ?? INITIAL_429_DELAY_MS * Math.pow(2, retryCount);
      await new Promise((r) => setTimeout(r, delay));
      return doOne(retryCount + 1, hasRetried401);
    }

    if (res.status >= 500 && res.status <= 599 && retryCount < MAX_5XX_RETRIES) {
      const delay = INITIAL_429_DELAY_MS * Math.pow(2, retryCount);
      await new Promise((r) => setTimeout(r, delay));
      return doOne(retryCount + 1, hasRetried401);
    }

    if (!res.ok) {
      const { message, code, details } = await parseErrorResponse(res);
      lastError = new ZohoApiError(message, res.status, code, details);
      throw lastError;
    }

    return res;
  };

  try {
    return await doOne();
  } catch (e) {
    if (e instanceof ZohoApiError) throw e;
    throw lastError ?? e;
  }
}

/** GET and parse JSON. */
export async function zohoGet<T>(path: string): Promise<T> {
  const res = await zohoFetch(path, { method: "GET" });
  return res.json() as Promise<T>;
}

/** POST and parse JSON. */
export async function zohoPost<T>(path: string, body: unknown): Promise<T> {
  const res = await zohoFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

/** PUT and parse JSON. */
export async function zohoPut<T>(path: string, body: unknown): Promise<T> {
  const res = await zohoFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}
