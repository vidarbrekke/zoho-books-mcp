import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolSpec } from "../../mcp/types.js";
import { toEnvelopeResult } from "./common.js";
import { createContactTool, createInvoiceTool } from "./create.js";
import { getContactTool, listContactsTool } from "./contacts.js";
import { getExpenseTool, listExpensesTool } from "./expenses.js";
import { getItemTool, listItemsTool } from "./items.js";
import { getReportTool } from "./reports.js";
import { listBillsTool, getBillTool } from "./bills.js";
import { listBankAccountsTool, listBankTransactionsTool } from "./banking.js";
import { listInvoicesTool } from "./invoices.js";

function adapt<TResult>(legacyTool: {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: any) => Promise<CallToolResult>;
}): ToolSpec {
  const operation = deriveOperation(legacyTool.name);
  return {
    name: legacyTool.name,
    description: legacyTool.description,
    inputSchema: legacyTool.inputSchema as Record<string, unknown>,
    handler: async (args: Record<string, unknown>) => {
      const result = await legacyTool.handler(args);
      return toEnvelopeResult<unknown>(
        result,
        "books",
        operation
      );
    },
    tier: isReadTool(legacyTool.name) ? "ga" : "ga",
    version: "v1",
    policyClass: isReadTool(legacyTool.name) ? "read-fast" : "read-write",
    service: "books",
    operation,
  };
}

function deriveOperation(name: string): string {
  return name.replace(/^zoho_books_/, "");
}

function isReadTool(name: string): boolean {
  const writeToolNames = new Set([
    "zoho_books_create_contact",
    "zoho_books_create_invoice",
  ]);
  return !writeToolNames.has(name);
}

export const booksToolSpecs: ToolSpec[] = [
  adapt(listInvoicesTool),
  adapt(getContactTool),
  adapt(listContactsTool),
  adapt(listExpensesTool),
  adapt(getExpenseTool),
  adapt(getItemTool),
  adapt(listItemsTool),
  adapt(getReportTool),
  adapt(createContactTool),
  adapt(createInvoiceTool),
  adapt(listBillsTool),
  adapt(getBillTool),
  adapt(listBankTransactionsTool),
  adapt(listBankAccountsTool),
];
