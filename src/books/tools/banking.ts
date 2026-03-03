/**
 * MCP tools for Zoho Books banking (bank accounts and transactions).
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ZohoBooksClient } from "../client.js";
import { formatToolError, shapeListResponse } from "./common.js";

const books = new ZohoBooksClient();

function toolResult(content: string, isError = false): CallToolResult {
  return {
    content: [{ type: "text" as const, text: content }],
    isError,
  };
}

export const listBankTransactionsTool = {
  name: "zoho_books_list_bank_transactions",
  description:
    "List bank transactions from Zoho Books. Optionally filter by account_id and paginate.",
  inputSchema: {
    account_id: z.string().optional().describe("Filter by bank account ID"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
    limit: z.number().min(1).max(200).optional().describe("Alias for per_page"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: {
    account_id?: string;
    page?: number;
    per_page?: number;
    limit?: number;
    fields?: string[];
    summary?: boolean;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listBankTransactions({
        ...args,
        per_page: args.per_page ?? args.limit,
      });
      const list = (res as { banktransactions?: unknown[] }).banktransactions ?? res;
      const shaped = shapeListResponse({
        list: Array.isArray(list) ? list : [],
        fields: args.fields,
        summary: args.summary,
      });
      return toolResult(JSON.stringify(shaped, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};

export const listBankAccountsTool = {
  name: "zoho_books_list_bank_accounts",
  description:
    "List bank accounts from Zoho Books chart of accounts.",
  inputSchema: {
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
    limit: z.number().min(1).max(200).optional().describe("Alias for per_page"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: {
    page?: number;
    per_page?: number;
    limit?: number;
    fields?: string[];
    summary?: boolean;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listBankAccounts({
        ...args,
        per_page: args.per_page ?? args.limit,
      });
      const list =
        (res as { chartofaccount?: unknown[] }).chartofaccount ?? res;
      const shaped = shapeListResponse({
        list: Array.isArray(list) ? list : [],
        fields: args.fields,
        summary: args.summary,
      });
      return toolResult(JSON.stringify(shaped, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};
