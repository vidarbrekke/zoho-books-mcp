import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearConfigCache, loadConfig } from "../../../src/core/config.js";
import { listBillsTool, getBillTool } from "../../../src/books/tools/bills.js";
import {
  listBankAccountsTool,
  listBankTransactionsTool,
} from "../../../src/books/tools/banking.js";
import { ZohoApiError } from "../../../src/core/types.js";

const { mockListBills, mockGetBill, mockListBankTransactions, mockListBankAccounts } =
  vi.hoisted(() => ({
    mockListBills: vi.fn(),
    mockGetBill: vi.fn(),
    mockListBankTransactions: vi.fn(),
    mockListBankAccounts: vi.fn(),
  }));
vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    listBills = mockListBills;
    getBill = mockGetBill;
    listBankTransactions = mockListBankTransactions;
    listBankAccounts = mockListBankAccounts;
  },
}));

describe("accounting tools", () => {
  beforeEach(() => {
    mockListBills.mockReset();
    mockGetBill.mockReset();
    mockListBankTransactions.mockReset();
    mockListBankAccounts.mockReset();
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  describe("bills", () => {
    it("lists bills (success path)", async () => {
      mockListBills.mockResolvedValueOnce({
        bills: [{ bill_id: "bill_1", total: 300 }],
      });
      const result = await listBillsTool.handler({});
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed[0].bill_id).toBe("bill_1");
    });

    it("gets a bill (success path)", async () => {
      mockGetBill.mockResolvedValueOnce({ bill_id: "bill_1", total: 300 });
      const result = await getBillTool.handler({ bill_id: "bill_1" });
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed.bill_id).toBe("bill_1");
    });

    it("returns formatted error when list bills API fails", async () => {
      mockListBills.mockRejectedValueOnce(new ZohoApiError("Server error", 500, 0));
      const result = await listBillsTool.handler({});
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });

    it("returns formatted error when get bill API fails", async () => {
      mockGetBill.mockRejectedValueOnce(
        new ZohoApiError("Bill not found", 404, 0)
      );
      const result = await getBillTool.handler({ bill_id: "bad_id" });
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });
  });

  describe("banking", () => {
    it("lists bank transactions (success path)", async () => {
      mockListBankTransactions.mockResolvedValueOnce({
        banktransactions: [{ transaction_id: "txn_1", amount: 50 }],
      });
      const result = await listBankTransactionsTool.handler({});
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed[0].transaction_id).toBe("txn_1");
    });

    it("lists bank accounts (success path)", async () => {
      mockListBankAccounts.mockResolvedValueOnce({
        chartofaccount: [{ account_id: "acc_1", account_name: "Main Bank" }],
      });
      const result = await listBankAccountsTool.handler({});
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed[0].account_id).toBe("acc_1");
    });

    it("returns formatted error when list bank transactions API fails", async () => {
      mockListBankTransactions.mockRejectedValueOnce(
        new ZohoApiError("Unauthorized", 401, 0)
      );
      const result = await listBankTransactionsTool.handler({});
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });

    it("returns formatted error when list bank accounts API fails", async () => {
      mockListBankAccounts.mockRejectedValueOnce(
        new ZohoApiError("Not found", 404, 0)
      );
      const result = await listBankAccountsTool.handler({});
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });
  });
});
