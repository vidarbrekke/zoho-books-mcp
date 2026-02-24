/**
 * MCP tools for Zoho Books reports (P&L, balance sheet, etc.).
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ZohoBooksClient } from "../client.js";
import { formatToolError, isoDateSchema, shapeObjectResponse } from "./common.js";

const books = new ZohoBooksClient();

const REPORT_TYPES = [
  "profit_and_loss",
  "balance_sheet",
  "cash_flow",
  "ar_aging",
  "ap_aging",
] as const;

function toolResult(content: string, isError = false): CallToolResult {
  return {
    content: [{ type: "text" as const, text: content }],
    isError,
  };
}

export const getReportTool = {
  name: "zoho_books_get_report",
  description:
    "Get a financial report from Zoho Books. report_type: profit_and_loss, balance_sheet, cash_flow, ar_aging, ap_aging. Optional date_start and date_end (YYYY-MM-DD).",
  inputSchema: {
    report_type: z
      .enum(REPORT_TYPES)
      .describe("Type of report to retrieve"),
    date_start: isoDateSchema.optional().describe("Start date YYYY-MM-DD"),
    date_end: isoDateSchema.optional().describe("End date YYYY-MM-DD"),
    fields: z.array(z.string()).optional().describe("Optional allowlist of fields"),
    summary: z.boolean().optional().describe("Return compact summary instead of full payload"),
  },
  handler: async (args: {
    report_type: (typeof REPORT_TYPES)[number];
    date_start?: string;
    date_end?: string;
    fields?: string[];
    summary?: boolean;
  }): Promise<CallToolResult> => {
    try {
      const report = await books.getReport(args.report_type, {
        date_start: args.date_start,
        date_end: args.date_end,
      });
      const shaped = shapeObjectResponse(report, args.fields, args.summary);
      return toolResult(JSON.stringify(shaped, null, 2));
    } catch (e) {
      return toolResult(formatToolError(e), true);
    }
  },
};
