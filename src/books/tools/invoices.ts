/**
 * MCP tools for Zoho Books invoices.
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

export const listInvoicesTool = {
  name: "zoho_books_list_invoices",
  description:
    "List invoices from Zoho Books. Optionally filter by status (draft,sent,viewed,overdue,paid,partially_paid,void) or customer_id.",
  inputSchema: {
    status: z.string().optional().describe("Filter by invoice status"),
    customer_id: z.string().optional().describe("Filter by customer ID"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
  },
  handler: async (args: {
    status?: string;
    customer_id?: string;
    page?: number;
    per_page?: number;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listInvoices(args);
      const list = (res as { invoices?: unknown[] }).invoices ?? res;
      return toolResult(JSON.stringify(list, null, 2));
    } catch (e) {
      const msg = e instanceof ZohoApiError ? e.message : String(e);
      return toolResult(`Error: ${msg}`, true);
    }
  },
};

export const getInvoiceTool = {
  name: "zoho_books_get_invoice",
  description: "Get a single Zoho Books invoice by its ID.",
  inputSchema: {
    invoice_id: z.string().describe("The invoice ID"),
  },
  handler: async (args: { invoice_id: string }): Promise<CallToolResult> => {
    try {
      const invoice = await books.getInvoice(args.invoice_id);
      return toolResult(JSON.stringify(invoice, null, 2));
    } catch (e) {
      const msg = e instanceof ZohoApiError ? e.message : String(e);
      return toolResult(`Error: ${msg}`, true);
    }
  },
};
