/**
 * MCP tools for Zoho Books items (products/services).
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

export const listItemsTool = {
  name: "zoho_books_list_items",
  description: "List items (products or services) from Zoho Books catalog.",
  inputSchema: {
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
  },
  handler: async (args: { page?: number; per_page?: number }): Promise<CallToolResult> => {
    try {
      const res = await books.listItems(args);
      const list = (res as { items?: unknown[] }).items ?? res;
      return toolResult(JSON.stringify(list, null, 2));
    } catch (e) {
      const msg = e instanceof ZohoApiError ? e.message : String(e);
      return toolResult(`Error: ${msg}`, true);
    }
  },
};

export const getItemTool = {
  name: "zoho_books_get_item",
  description: "Get a single Zoho Books item (product/service) by ID.",
  inputSchema: {
    item_id: z.string().describe("The item ID"),
  },
  handler: async (args: { item_id: string }): Promise<CallToolResult> => {
    try {
      const item = await books.getItem(args.item_id);
      return toolResult(JSON.stringify(item, null, 2));
    } catch (e) {
      const msg = e instanceof ZohoApiError ? e.message : String(e);
      return toolResult(`Error: ${msg}`, true);
    }
  },
};
