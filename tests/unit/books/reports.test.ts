import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearConfigCache, loadConfig } from "../../../src/core/config.js";
import { getReportTool } from "../../../src/books/tools/reports.js";
import { ZohoApiError } from "../../../src/core/types.js";

const { mockGetReport } = vi.hoisted(() => ({
  mockGetReport: vi.fn(),
}));
vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    getReport = mockGetReport;
  },
}));

describe("reports tools", () => {
  beforeEach(() => {
    mockGetReport.mockReset();
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  it("returns report (success path) with date range", async () => {
    mockGetReport.mockResolvedValueOnce({
      profit_and_loss: { net_income: 1000 },
      report_type: "profit_and_loss",
    });
    const result = await getReportTool.handler({
      report_type: "profit_and_loss",
      date_start: "2025-01-01",
      date_end: "2025-01-31",
    });
    expect(result.isError).toBeFalsy();
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    const parsed = JSON.parse(text);
    expect(parsed.profit_and_loss).toBeDefined();
    expect(mockGetReport).toHaveBeenCalledWith("profit_and_loss", {
      date_start: "2025-01-01",
      date_end: "2025-01-31",
    });
  });

  it("returns formatted error when report API fails", async () => {
    mockGetReport.mockRejectedValueOnce(
      new ZohoApiError("Report unavailable", 500, 0)
    );
    const result = await getReportTool.handler({
      report_type: "balance_sheet",
    });
    expect(result.isError).toBe(true);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("Zoho API error");
  });

  it("handles non-ZohoApiError (generic error path)", async () => {
    mockGetReport.mockRejectedValueOnce(new Error("Network timeout"));
    const result = await getReportTool.handler({
      report_type: "ar_aging",
    });
    expect(result.isError).toBe(true);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("Error:");
    expect(text).toContain("Network timeout");
  });
});
