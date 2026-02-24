/**
 * MCP tools for Zoho Books invoices.
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

export const listInvoicesTool = {
  name: "zoho_books_list_invoices",
  description:
    "List invoices from Zoho Books. Optionally filter by status (draft,sent,viewed,overdue,paid,partially_paid,void) or customer_id.",
  inputSchema: {
    status: z.string().optional().describe("Filter by invoice status"),
    customer_id: z.string().optional().describe("Filter by customer ID"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
    limit: z.number().min(1).max(200).optional().describe("Alias for per_page"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: {
    status?: string;
    customer_id?: string;
    page?: number;
    per_page?: number;
    limit?: number;
    fields?: string[];
    summary?: boolean;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listInvoices({
        ...args,
        per_page: args.per_page ?? args.limit,
      });
      const list = (res as { invoices?: unknown[] }).invoices ?? res;
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

export const getInvoiceTool = {
  name: "zoho_books_get_invoice",
  description: "Get a single Zoho Books invoice by its ID.",
  inputSchema: {
    invoice_id: z.string().describe("The invoice ID"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: { invoice_id: string; fields?: string[]; summary?: boolean }): Promise<CallToolResult> => {
    try {
      const invoice = await books.getInvoice(args.invoice_id);
      const shaped = shapeObjectResponse(invoice, args.fields, args.summary);
      return toolResult(JSON.stringify(shaped, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};
