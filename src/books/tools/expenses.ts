/**
 * MCP tools for Zoho Books expenses.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ZohoBooksClient } from "../client.js";
import { ZohoApiError } from "../../core/types.js";

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
    date_start: z.string().optional().describe("Start date YYYY-MM-DD"),
    date_end: z.string().optional().describe("End date YYYY-MM-DD"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
  },
  handler: async (args: {
    date_start?: string;
    date_end?: string;
    page?: number;
    per_page?: number;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listExpenses(args);
      const list = (res as { expenses?: unknown[] }).expenses ?? res;
      return toolResult(JSON.stringify(list, null, 2));
    } catch (e) {
      const msg = e instanceof ZohoApiError ? e.message : String(e);
      return toolResult(`Error: ${msg}`, true);
    }
  },
};

export const getExpenseTool = {
  name: "zoho_books_get_expense",
  description: "Get a single Zoho Books expense by its ID.",
  inputSchema: {
    expense_id: z.string().describe("The expense ID"),
  },
  handler: async (args: { expense_id: string }): Promise<CallToolResult> => {
    try {
      const expense = await books.getExpense(args.expense_id);
      return toolResult(JSON.stringify(expense, null, 2));
    } catch (e) {
      const msg = e instanceof ZohoApiError ? e.message : String(e);
      return toolResult(`Error: ${msg}`, true);
    }
  },
};
