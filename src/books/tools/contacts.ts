/**
 * MCP tools for Zoho Books contacts (customers and vendors).
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

export const listContactsTool = {
  name: "zoho_books_list_contacts",
  description:
    "List contacts (customers or vendors) from Zoho Books. Optionally filter by type and paginate.",
  inputSchema: {
    type: z.enum(["customer", "vendor"]).optional().describe("customer or vendor"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
    limit: z.number().min(1).max(200).optional().describe("Alias for per_page"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: {
    type?: "customer" | "vendor";
    page?: number;
    per_page?: number;
    limit?: number;
    fields?: string[];
    summary?: boolean;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listContacts({
        ...args,
        per_page: args.per_page ?? args.limit,
      });
      const list = (res as { contacts?: unknown[] }).contacts ?? res;
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

export const getContactTool = {
  name: "zoho_books_get_contact",
  description: "Get a single Zoho Books contact (customer or vendor) by ID.",
  inputSchema: {
    contact_id: z.string().describe("The contact ID"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: { contact_id: string; fields?: string[]; summary?: boolean }): Promise<CallToolResult> => {
    try {
      const contact = await books.getContact(args.contact_id);
      const shaped = shapeObjectResponse(contact, args.fields, args.summary);
      return toolResult(JSON.stringify(shaped, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};
