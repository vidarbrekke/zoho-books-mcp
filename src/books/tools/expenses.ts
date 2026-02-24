/**
 * MCP tools for Zoho Books expenses.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ZohoBooksClient } from "../client.js";
import {
  formatToolError,
  isoDateSchema,
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

export const listExpensesTool = {
  name: "zoho_books_list_expenses",
  description:
    "List expenses from Zoho Books. Optionally filter by date_start and date_end (YYYY-MM-DD).",
  inputSchema: {
    date_start: isoDateSchema.optional().describe("Start date YYYY-MM-DD"),
    date_end: isoDateSchema.optional().describe("End date YYYY-MM-DD"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
    limit: z.number().min(1).max(200).optional().describe("Alias for per_page"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: {
    date_start?: string;
    date_end?: string;
    page?: number;
    per_page?: number;
    limit?: number;
    fields?: string[];
    summary?: boolean;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listExpenses({
        ...args,
        per_page: args.per_page ?? args.limit,
      });
      const list = (res as { expenses?: unknown[] }).expenses ?? res;
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

export const getExpenseTool = {
  name: "zoho_books_get_expense",
  description: "Get a single Zoho Books expense by its ID.",
  inputSchema: {
    expense_id: z.string().describe("The expense ID"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: { expense_id: string; fields?: string[]; summary?: boolean }): Promise<CallToolResult> => {
    try {
      const expense = await books.getExpense(args.expense_id);
      const shaped = shapeObjectResponse(expense, args.fields, args.summary);
      return toolResult(JSON.stringify(shaped, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};
