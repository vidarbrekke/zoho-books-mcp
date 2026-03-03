import { describe, it, expect, vi, beforeEach } from "vitest";
import { listInvoicesTool, getInvoiceTool } from "../../../src/books/tools/invoices.js";
import { loadConfig, clearConfigCache } from "../../../src/core/config.js";
import { ZohoApiError } from "../../../src/core/types.js";

const { mockListInvoices, mockGetInvoice } = vi.hoisted(() => ({
  mockListInvoices: vi.fn(),
  mockGetInvoice: vi.fn(),
}));
vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    listInvoices = mockListInvoices;
    getInvoice = mockGetInvoice;
  },
}));

describe("listInvoicesTool", () => {
  beforeEach(() => {
    mockListInvoices.mockReset();
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  it("returns JSON list of invoices (success path)", async () => {
    mockListInvoices.mockResolvedValueOnce({
      invoices: [{ invoice_id: "inv_1", total: 100 }],
    });
    const result = await listInvoicesTool.handler({});
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    const parsed = JSON.parse(text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].invoice_id).toBe("inv_1");
    expect(parsed[0].total).toBe(100);
  });

  it("returns formatted error when list API fails", async () => {
    mockListInvoices.mockRejectedValueOnce(new ZohoApiError("Not found", 404, 0));
    const result = await listInvoicesTool.handler({});
    expect(result.isError).toBe(true);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("Zoho API error");
    expect(text).toContain("404");
  });
});

describe("getInvoiceTool", () => {
  beforeEach(() => {
    mockGetInvoice.mockReset();
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  it("returns single invoice (success path)", async () => {
    mockGetInvoice.mockResolvedValueOnce({
      invoice_id: "inv_1",
      total: 100,
      status: "sent",
    });
    const result = await getInvoiceTool.handler({ invoice_id: "inv_1" });
    expect(result.isError).toBeFalsy();
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    const parsed = JSON.parse(text);
    expect(parsed.invoice_id).toBe("inv_1");
    expect(parsed.total).toBe(100);
  });

  it("returns formatted error when get API fails", async () => {
    mockGetInvoice.mockRejectedValueOnce(
      new ZohoApiError("Invoice not found", 404, 0)
    );
    const result = await getInvoiceTool.handler({ invoice_id: "bad_id" });
    expect(result.isError).toBe(true);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("Zoho API error");
    expect(text).toContain("404");
  });
});
