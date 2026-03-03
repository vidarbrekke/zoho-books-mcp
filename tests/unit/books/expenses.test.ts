import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearConfigCache, loadConfig } from "../../../src/core/config.js";
import { listExpensesTool, getExpenseTool } from "../../../src/books/tools/expenses.js";
import { ZohoApiError } from "../../../src/core/types.js";

const { mockListExpenses, mockGetExpense } = vi.hoisted(() => ({
  mockListExpenses: vi.fn(),
  mockGetExpense: vi.fn(),
}));
vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    listExpenses = mockListExpenses;
    getExpense = mockGetExpense;
  },
}));

describe("expenses tools", () => {
  beforeEach(() => {
    mockListExpenses.mockReset();
    mockGetExpense.mockReset();
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  describe("listExpensesTool", () => {
    it("returns shaped list (success path)", async () => {
      mockListExpenses.mockResolvedValueOnce({
        expenses: [{ expense_id: "exp_1", total: 50 }],
      });
      const result = await listExpensesTool.handler({});
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].expense_id).toBe("exp_1");
    });

    it("returns formatted error when API fails", async () => {
      mockListExpenses.mockRejectedValueOnce(new ZohoApiError("Server error", 500, 0));
      const result = await listExpensesTool.handler({});
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });
  });

  describe("getExpenseTool", () => {
    it("returns single expense (success path)", async () => {
      mockGetExpense.mockResolvedValueOnce({
        expense_id: "exp_1",
        total: 50,
        date: "2025-01-15",
      });
      const result = await getExpenseTool.handler({ expense_id: "exp_1" });
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed.expense_id).toBe("exp_1");
      expect(parsed.total).toBe(50);
    });

    it("returns formatted error when get API fails", async () => {
      mockGetExpense.mockRejectedValueOnce(
        new ZohoApiError("Expense not found", 404, 0)
      );
      const result = await getExpenseTool.handler({ expense_id: "bad_id" });
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });
  });
});
