import { describe, expect, it } from "vitest";
import { ToolRegistry } from "../../../src/mcp/server.js";
import { TransportCoordinator } from "../../../src/mcp/transport.js";
import { MCP_ERROR_CODES } from "../../../src/mcp/errors.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("mcp transport", () => {
  it("returns deterministic tool metadata with transport list envelope", async () => {
    const registry = new ToolRegistry();
    registry.registerToolSpec({
      name: "zoho_books_list_invoices",
      description: "List invoices",
      inputSchema: {},
      handler: () => ({ ok: true, result: [] }),
      tier: "ga",
      version: "v1",
      policyClass: "read-fast",
      service: "books",
      operation: "list_invoices",
    });

    const transport = new TransportCoordinator(registry);
    const responseText = await transport.handleRawRequest(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    );
    const payload = JSON.parse(responseText);
    const tool = payload.result.tools[0];

    expect(tool.name).toBe("zoho_books_list_invoices");
    expect(tool.tier).toBe("ga");
    expect(tool.version).toBe("v1");
    expect(tool.policyClass).toBe("read-fast");
    expect(tool.service).toBe("books");
    expect(tool.operation).toBe("list_invoices");
  });

  it("handles concurrent calls under cap without dropping JSON", async () => {
    const registry = new ToolRegistry();
    registry.registerToolSpec({
      name: "zoho_books_get_invoice",
      description: "Get invoice",
      inputSchema: {},
      handler: async () => {
        await delay(15);
        return { ok: true, result: { invoice_id: "id" } };
      },
    });

    const transport = new TransportCoordinator(registry, {
      maxInFlight: 5,
      maxQueueSize: 40,
    });

    const requests = Array.from({ length: 20 }, (_, i) =>
      transport.handleRawRequest(
        JSON.stringify({
          jsonrpc: "2.0",
          id: i + 1,
          method: "tools/call",
          params: { name: "zoho_books_get_invoice", arguments: {} },
        })
      )
    );

    const responses = await Promise.all(requests);
    expect(responses).toHaveLength(20);
    const parsed = responses.map((r) => JSON.parse(r));
    expect(parsed.every((r) => r.jsonrpc === "2.0" && r.result?.ok)).toBe(true);
  });

  it("returns resource_exhausted when queue is full", async () => {
    const registry = new ToolRegistry();
    registry.registerToolSpec({
      name: "zoho_books_get_invoice",
      description: "Get invoice",
      inputSchema: {},
      handler: async () => {
        await delay(50);
        return { ok: true, result: { invoice_id: "id" } };
      },
    });

    const transport = new TransportCoordinator(registry, {
      maxInFlight: 1,
      maxQueueSize: 1,
    });

    const requests = [
      transport.handleRawRequest(
        JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "zoho_books_get_invoice", arguments: {} } })
      ),
      transport.handleRawRequest(
        JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "zoho_books_get_invoice", arguments: {} } })
      ),
      transport.handleRawRequest(
        JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "zoho_books_get_invoice", arguments: {} } })
      ),
    ];

    const responses = await Promise.all(requests);
    const parsed = responses.map((r) => JSON.parse(r));
    const hasBackpressure = parsed.some(
      (r) => r.error?.code === MCP_ERROR_CODES.resource_exhausted
    );
    expect(hasBackpressure).toBe(true);
  });
});
