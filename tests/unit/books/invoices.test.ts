import { describe, it, expect, vi, beforeEach } from "vitest";
import { listInvoicesTool } from "../../../src/books/tools/invoices.js";
import { loadConfig, clearConfigCache } from "../../../src/core/config.js";

vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    listInvoices = vi.fn().mockResolvedValue({
      invoices: [{ invoice_id: "inv_1", total: 100 }],
    });
  },
}));

describe("listInvoicesTool", () => {
  beforeEach(() => {
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  it("returns JSON list of invoices", async () => {
    const result = await listInvoicesTool.handler({});
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    const parsed = JSON.parse(text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].invoice_id).toBe("inv_1");
    expect(parsed[0].total).toBe(100);
  });
});
