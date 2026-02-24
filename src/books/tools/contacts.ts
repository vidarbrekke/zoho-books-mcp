/**
 * MCP tools for Zoho Books contacts (customers and vendors).
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

export const listContactsTool = {
  name: "zoho_books_list_contacts",
  description:
    "List contacts (customers or vendors) from Zoho Books. Optionally filter by type and paginate.",
  inputSchema: {
    type: z.enum(["customer", "vendor"]).optional().describe("customer or vendor"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    per_page: z.number().min(1).max(200).optional().describe("Items per page"),
  },
  handler: async (args: {
    type?: "customer" | "vendor";
    page?: number;
    per_page?: number;
  }): Promise<CallToolResult> => {
    try {
      const res = await books.listContacts(args);
      const list = (res as { contacts?: unknown[] }).contacts ?? res;
      return toolResult(JSON.stringify(list, null, 2));
    } catch (e) {
      const msg = e instanceof ZohoApiError ? e.message : String(e);
      return toolResult(`Error: ${msg}`, true);
    }
  },
};

export const getContactTool = {
  name: "zoho_books_get_contact",
  description: "Get a single Zoho Books contact (customer or vendor) by ID.",
  inputSchema: {
    contact_id: z.string().describe("The contact ID"),
  },
  handler: async (args: { contact_id: string }): Promise<CallToolResult> => {
    try {
      const contact = await books.getContact(args.contact_id);
      return toolResult(JSON.stringify(contact, null, 2));
    } catch (e) {
      const msg = e instanceof ZohoApiError ? e.message : String(e);
      return toolResult(`Error: ${msg}`, true);
    }
  },
};
