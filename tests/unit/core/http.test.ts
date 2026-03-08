import { describe, it, expect, beforeEach, vi } from "vitest";
import { zohoGet, zohoFetch } from "../../../src/core/http.js";
import { loadConfig, clearConfigCache } from "../../../src/core/config.js";
import { setAccessToken } from "../../../src/core/auth.js";
import { ZohoApiError } from "../../../src/core/types.js";

describe("http", () => {
  beforeEach(() => {
    clearConfigCache();
    vi.stubGlobal("fetch", vi.fn());
    process.env.ZOHO_CLIENT_ID = "cid";
    process.env.ZOHO_CLIENT_SECRET = "csecret";
    process.env.ZOHO_REFRESH_TOKEN = "rtok";
    process.env.ZOHO_ORG_ID = "org1";
    process.env.ZOHO_REGION = "US";
    loadConfig();
    setAccessToken("valid_token");
  });

  it("zohoFetch throws ZohoApiError on 400 with message from body", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: "Invalid request", code: 123 }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    let err: unknown;
    try {
      await zohoFetch("/books/v3/invoices?organization_id=org1");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ZohoApiError);
    expect((err as ZohoApiError).status).toBe(400);
    expect((err as ZohoApiError).message).toBe("Invalid request");
  });

  it("zohoGet returns parsed JSON", async () => {
    const mockFetch = vi.mocked(fetch);
    const data = { invoices: [{ id: "inv_1" }] };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await zohoGet<{ invoices: unknown[] }>(
      "/books/v3/invoices?organization_id=org1"
    );
    expect(result.invoices).toHaveLength(1);
    expect((result.invoices[0] as { id: string }).id).toBe("inv_1");
  });

  it("does not set Content-Type header for GET without body", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await zohoGet<{ ok: boolean }>("/books/v3/invoices?organization_id=org1");
    const [, options] = mockFetch.mock.calls[0];
    const headers = (options?.headers ?? {}) as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers.Authorization).toContain("Zoho-oauthtoken");
});

it("retries 429 with Retry-After", async () => {
  const mockFetch = vi.mocked(fetch);
  vi.useFakeTimers();
  mockFetch
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 0, message: "Too Many Requests" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "1" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ invoices: [{ id: "inv_1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

  const promise = zohoGet<{ invoices: unknown[] }>("/books/v3/invoices?organization_id=org1");
  await vi.advanceTimersToNextTimerAsync();
  const result = await promise;

  expect(result.invoices).toHaveLength(1);
  expect(mockFetch).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});

it("retries one 5xx response and succeeds", async () => {
  const mockFetch = vi.mocked(fetch);
  vi.useFakeTimers();
  mockFetch
    .mockResolvedValueOnce(new Response("{}", { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

  const promise = zohoGet<{ ok: boolean }>("/books/v3/invoices?organization_id=org1");
  await vi.advanceTimersToNextTimerAsync();
  const result = await promise;

  expect(result.ok).toBe(true);
  expect(mockFetch).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});

it("does not retry for non-retryable 400 responses", async () => {
  const mockFetch = vi.mocked(fetch);
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "Invalid request", code: 123 }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  );
  await expect(
    zohoGet("/books/v3/invoices?organization_id=org1")
  ).rejects.toThrow("Invalid request");
  expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
