import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  refreshAccessToken,
  getAccessToken,
  setAccessToken,
  setTokenProvider,
  resetTokenProviderForTests,
} from "../../../src/core/auth.js";
import { loadConfig, clearConfigCache } from "../../../src/core/config.js";

describe("auth", () => {
  beforeEach(() => {
    clearConfigCache();
    resetTokenProviderForTests();
    vi.stubGlobal("fetch", vi.fn());
    process.env.ZOHO_CLIENT_ID = "cid";
    process.env.ZOHO_CLIENT_SECRET = "csecret";
    process.env.ZOHO_REFRESH_TOKEN = "rtok";
    process.env.ZOHO_ORG_ID = "org1";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  it("refreshAccessToken calls fetch with correct URL and body", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "new_token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const token = await refreshAccessToken();

    expect(token).toBe("new_token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://accounts.zoho.com/oauth/v2/token");
    expect(opts?.method).toBe("POST");
    const body = new URLSearchParams((opts?.body as string) ?? "");
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("rtok");
    expect(body.get("client_id")).toBe("cid");
  });

  it("getAccessToken returns token set by refreshAccessToken", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "at" }), { status: 200 })
    );
    await refreshAccessToken();
    expect(getAccessToken()).toBe("at");
  });

  it("setAccessToken updates in-memory token", () => {
    setAccessToken("manual");
    expect(getAccessToken()).toBe("manual");
  });

  it("uses single-flight refresh for concurrent calls", async () => {
    const mockFetch = vi.mocked(fetch);
    let resolver: ((res: Response) => void) | null = null;
    const pending = new Promise<Response>((resolve) => {
      resolver = resolve;
    });
    mockFetch.mockReturnValueOnce(pending);

    const p1 = refreshAccessToken();
    const p2 = refreshAccessToken();

    resolver!(
      new Response(JSON.stringify({ access_token: "shared_token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const [t1, t2] = await Promise.all([p1, p2]);
    expect(t1).toBe("shared_token");
    expect(t2).toBe("shared_token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("supports swapping token provider via seam", async () => {
    const mockRefresh = vi.fn().mockResolvedValue("provider-token");
    setTokenProvider({
      getAccessToken: () => "provider-token",
      refreshAccessToken: async () => mockRefresh(),
      setAccessToken: () => undefined,
    });

    const token = await refreshAccessToken();
    expect(token).toBe("provider-token");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("provider-token");
  });
});
