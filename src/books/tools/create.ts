/**
 * MCP tools for creating Zoho Books contacts and invoices.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ZohoBooksClient } from "../client.js";
import { assertWriteAllowed, formatToolError, isoDateSchema } from "./common.js";

const books = new ZohoBooksClient();

function toolResult(content: string, isError = false): CallToolResult {
  return {
    content: [{ type: "text" as const, text: content }],
    isError,
  };
}

export const createContactTool = {
  name: "zoho_books_create_contact",
  description:
    "Create a contact (customer or vendor) in Zoho Books. Requires contact_name and contact_type (customer/vendor). Optional: email, company_name, phone, billing_address, etc.",
  inputSchema: {
    contact_name: z.string().min(1).describe("Full name of the contact"),
    contact_type: z.enum(["customer", "vendor"]).describe("customer or vendor"),
    email: z.string().email().optional().describe("Email address"),
    company_name: z.string().optional().describe("Company name"),
    phone: z.string().optional().describe("Phone number"),
    billing_address: z
      .object({
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
      })
      .optional()
      .describe("Billing address"),
  },
  handler: async (args: {
    contact_name: string;
    contact_type: "customer" | "vendor";
    email?: string;
    company_name?: string;
    phone?: string;
    billing_address?: { address?: string; city?: string; state?: string; zip?: string; country?: string };
  }): Promise<CallToolResult> => {
    try {
      assertWriteAllowed();
      const body: Record<string, unknown> = {
        contact_name: args.contact_name,
        contact_type: args.contact_type,
      };
      if (args.email) body.email = args.email;
      if (args.company_name) body.company_name = args.company_name;
      if (args.phone) body.phone = args.phone;
      if (args.billing_address) body.billing_address = args.billing_address;
      const contact = await books.createContact(body);
      return toolResult(JSON.stringify(contact, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};

export const createInvoiceTool = {
  name: "zoho_books_create_invoice",
  description:
    "Create a sales invoice in Zoho Books. Requires customer_id and line_items (array of { item_id, quantity, rate } or { name, quantity, rate }). Optional: date, due_days, reference_number, notes.",
  inputSchema: {
    customer_id: z.string().describe("Zoho Books contact ID of the customer"),
    line_items: z
      .array(
        z.object({
          item_id: z.string().optional().describe("Item ID if using existing item"),
          name: z.string().optional().describe("Line item name if not using item_id"),
          quantity: z.number().positive().describe("Quantity"),
          rate: z.number().describe("Unit rate/price"),
        })
      )
      .min(1)
      .describe("At least one line item (use item_id or name)"),
    date: isoDateSchema.optional().describe("Invoice date YYYY-MM-DD"),
    due_days: z.number().int().min(0).optional().describe("Days until due (default from org)"),
    reference_number: z.string().optional().describe("Your reference number"),
    notes: z.string().optional().describe("Notes visible on invoice"),
  },
  handler: async (args: {
    customer_id: string;
    line_items: Array<{ item_id?: string; name?: string; quantity: number; rate: number }>;
    date?: string;
    due_days?: number;
    reference_number?: string;
    notes?: string;
  }): Promise<CallToolResult> => {
    try {
      assertWriteAllowed();
      const body: Record<string, unknown> = {
        customer_id: args.customer_id,
        line_items: args.line_items.map((li) =>
          li.item_id
            ? { item_id: li.item_id, quantity: li.quantity, rate: li.rate }
            : { name: li.name ?? "Item", quantity: li.quantity, rate: li.rate }
        ),
      };
      if (args.date) body.date = args.date;
      if (args.due_days != null) body.due_days = args.due_days;
      if (args.reference_number) body.reference_number = args.reference_number;
      if (args.notes) body.notes = args.notes;
      const invoice = await books.createInvoice(body);
      return toolResult(JSON.stringify(invoice, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};
