/**
 * MCP tools for Zoho Books bills.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ZohoBooksClient } from "../client.js";
import {
  formatToolError,
  shapeListResponse,
  shapeObjectResponse,
} from "./common.js";

const books = new ZohoBooksClient();

function toolResult(content: string, isError = false): CallToolResult {
  return {
    content: [{ type: "text" as const, text: content }],
    isError,
  };
}

export const listBillsTool = {
  name: "zoho_books_list_bills",
  description:
    "List bills from Zoho Books. Optionally filter by status and paginate.",
  inputSchema: {
    status: z.string().optional().describe("Filter by bill status"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
    limit: z.number().min(1).max(200).optional().describe("Alias for per_page"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: {
    status?: string;
    page?: number;
    per_page?: number;
    limit?: number;
    fields?: string[];
    summary?: boolean;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listBills({
        ...args,
        per_page: args.per_page ?? args.limit,
      });
      const list = (res as { bills?: unknown[] }).bills ?? res;
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

export const getBillTool = {
  name: "zoho_books_get_bill",
  description: "Get a single Zoho Books bill by its ID.",
  inputSchema: {
    bill_id: z.string().describe("The bill ID"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: { bill_id: string; fields?: string[]; summary?: boolean }): Promise<CallToolResult> => {
    try {
      const bill = await books.getBill(args.bill_id);
      const shaped = shapeObjectResponse(bill, args.fields, args.summary);
      return toolResult(JSON.stringify(shaped, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};
