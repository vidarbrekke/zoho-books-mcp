/**
 * Zoho Books MCP server entry point.
 * Loads config at startup, registers Books tools, connects stdio.
 */

import { createInterface } from "node:readline";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./core/config.js";
import { ToolRegistry } from "./mcp/server.js";
import { booksToolSpecs } from "./books/tools/specs.js";
import { TransportCoordinator } from "./mcp/transport.js";

loadConfig();

const toolRegistry = new ToolRegistry();
for (const toolSpec of booksToolSpecs) {
  toolRegistry.registerToolSpec(toolSpec);
}

const server = new McpServer(
  {
    name: "zoho-books-mcp",
    version: "0.1.0",
  },
  {}
);

for (const toolSpec of toolRegistry.listToolSpecs()) {
  server.registerTool(toolSpec.name, {
    description: toolSpec.description,
    inputSchema: toolSpec.inputSchema,
  } as any, async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const envelope = await toolRegistry.executeTool(toolSpec.name, args as Record<string, unknown>);
    if (envelope.ok) {
      return {
        content: [{ type: "text", text: JSON.stringify(envelope.result, null, 2) }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(envelope.error, null, 2) }],
      isError: true,
    };
  });
}

async function main() {
  if (process.env.ZOHO_MCP_TRANSPORT === "sdk") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  const transport = new TransportCoordinator(toolRegistry);
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", (line) => {
    const raw = line.trim();
    if (!raw) {
      return;
    }

    void (async () => {
      try {
        const parsed = raw.trim();
        const responses =
          parsed.startsWith("[") ? await transport.handleRequestBatch(parsed) : [await transport.handleRawRequest(parsed)];
        for (const response of responses) {
          process.stdout.write(`${response}\n`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        process.stdout.write(
          `${JSON.stringify({
            jsonrpc: "2.0",
            error: { code: "internal_error", message },
          })}\n`
        );
      }
    })();
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
