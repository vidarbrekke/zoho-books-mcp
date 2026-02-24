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
});
