/**
 * Zoho Books MCP server entry point.
 * Loads config at startup, registers Books tools, connects stdio.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./core/config.js";
import { listInvoicesTool, getInvoiceTool } from "./books/tools/invoices.js";
import { listContactsTool, getContactTool } from "./books/tools/contacts.js";
import { listExpensesTool, getExpenseTool } from "./books/tools/expenses.js";
import { listItemsTool, getItemTool } from "./books/tools/items.js";
import { getReportTool } from "./books/tools/reports.js";
import { createContactTool, createInvoiceTool } from "./books/tools/create.js";

loadConfig();

const server = new McpServer(
  {
    name: "zoho-books-mcp",
    version: "0.1.0",
  },
  {}
);

server.registerTool(listInvoicesTool.name, {
  description: listInvoicesTool.description,
  inputSchema: listInvoicesTool.inputSchema,
}, listInvoicesTool.handler);
server.registerTool(getInvoiceTool.name, {
  description: getInvoiceTool.description,
  inputSchema: getInvoiceTool.inputSchema,
}, getInvoiceTool.handler);
server.registerTool(listContactsTool.name, {
  description: listContactsTool.description,
  inputSchema: listContactsTool.inputSchema,
}, listContactsTool.handler);
server.registerTool(getContactTool.name, {
  description: getContactTool.description,
  inputSchema: getContactTool.inputSchema,
}, getContactTool.handler);
server.registerTool(listExpensesTool.name, {
  description: listExpensesTool.description,
  inputSchema: listExpensesTool.inputSchema,
}, listExpensesTool.handler);
server.registerTool(getExpenseTool.name, {
  description: getExpenseTool.description,
  inputSchema: getExpenseTool.inputSchema,
}, getExpenseTool.handler);
server.registerTool(listItemsTool.name, {
  description: listItemsTool.description,
  inputSchema: listItemsTool.inputSchema,
}, listItemsTool.handler);
server.registerTool(getItemTool.name, {
  description: getItemTool.description,
  inputSchema: getItemTool.inputSchema,
}, getItemTool.handler);
server.registerTool(getReportTool.name, {
  description: getReportTool.description,
  inputSchema: getReportTool.inputSchema,
}, getReportTool.handler);
server.registerTool(createContactTool.name, {
  description: createContactTool.description,
  inputSchema: createContactTool.inputSchema,
}, createContactTool.handler);
server.registerTool(createInvoiceTool.name, {
  description: createInvoiceTool.description,
  inputSchema: createInvoiceTool.inputSchema,
}, createInvoiceTool.handler);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
