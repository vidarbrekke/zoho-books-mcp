import { describe, expect, it, beforeEach, vi } from "vitest";
import { ToolRegistry } from "../../../src/mcp/server.js";
import { TransportCoordinator } from "../../../src/mcp/transport.js";
import { booksToolSpecs } from "../../../src/books/tools/specs.js";
import { clearConfigCache } from "../../../src/core/config.js";

const mockedBookClient = vi.hoisted(() => ({
  listInvoices: vi.fn(),
}));

vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    listInvoices = mockedBookClient.listInvoices;
  },
}));

describe("phase-1 acceptance smoke", () => {
  beforeEach(() => {
    clearConfigCache();
    mockedBookClient.listInvoices.mockReset();
    mockedBookClient.listInvoices.mockResolvedValue({ invoices: [{ invoice_id: "inv_1" }] });
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "org";
    process.env.ZOHO_REGION = "US";
    process.env.ZOHO_READ_ONLY = "1";
  });

  it("supports initialize and tool list/call in OpenClaw-style flow", async () => {
    const registry = new ToolRegistry();
    for (const spec of booksToolSpecs) {
      registry.registerToolSpec(spec);
    }
    const transport = new TransportCoordinator(registry);

    const init = JSON.parse(await transport.handleRawRequest(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" })));
    expect(init.result).toMatchObject({ serverInfo: { name: "zoho-books-mcp" } });

    const list = JSON.parse(
      await transport.handleRawRequest(
        JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })
      )
    );
    expect(Array.isArray(list.result.tools)).toBe(true);

    const call = JSON.parse(
      await transport.handleRawRequest(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "zoho_books_list_invoices", arguments: { limit: 2 } },
        })
      )
    );
    expect(call.result).toBeDefined();
    expect(typeof call.result.ok).toBe("boolean");
  });

  it("keeps read-only mode controlled by env", async () => {
    process.env.ZOHO_READ_ONLY = "1";
    clearConfigCache();
    const registry = new ToolRegistry();
    for (const spec of booksToolSpecs) {
      registry.registerToolSpec(spec);
    }

    const transport = new TransportCoordinator(registry);
    const call = JSON.parse(
      await transport.handleRawRequest(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "zoho_books_list_invoices", arguments: { limit: 2 } },
        })
      )
    );

    expect(call.result?.ok).toBe(true);
  });
});
