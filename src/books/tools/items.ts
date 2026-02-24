/**
 * MCP tools for Zoho Books items (products/services).
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

export const listItemsTool = {
  name: "zoho_books_list_items",
  description: "List items (products or services) from Zoho Books catalog.",
  inputSchema: {
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
    limit: z.number().min(1).max(200).optional().describe("Alias for per_page"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: { page?: number; per_page?: number; limit?: number; fields?: string[]; summary?: boolean }): Promise<CallToolResult> => {
    try {
      const res = await books.listItems({
        ...args,
        per_page: args.per_page ?? args.limit,
      });
      const list = (res as { items?: unknown[] }).items ?? res;
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

export const getItemTool = {
  name: "zoho_books_get_item",
  description: "Get a single Zoho Books item (product/service) by ID.",
  inputSchema: {
    item_id: z.string().describe("The item ID"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: { item_id: string; fields?: string[]; summary?: boolean }): Promise<CallToolResult> => {
    try {
      const item = await books.getItem(args.item_id);
      const shaped = shapeObjectResponse(item, args.fields, args.summary);
      return toolResult(JSON.stringify(shaped, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};
