import { describe, expect, it } from "vitest";
import { ToolRegistry } from "../../../src/mcp/server.js";

describe("mcp registry", () => {
  it("registers and lists tools deterministically", () => {
    const registry = new ToolRegistry();
    registry.registerToolSpec({
      name: "tool_b",
      description: "Second",
      inputSchema: {},
      handler: () => ({ ok: true, result: "b" }),
    });
    registry.registerToolSpec({
      name: "tool_a",
      description: "First",
      inputSchema: {},
      handler: () => ({ ok: true, result: "a" }),
    });

    const names = registry.listToolSpecs().map((tool) => tool.name);
    expect(names).toEqual(["tool_a", "tool_b"]);
  });

  it("executes a registered tool via executeTool", async () => {
    const registry = new ToolRegistry();
    registry.registerToolSpec({
      name: "tool_a",
      description: "Test tool",
      inputSchema: {},
      handler: ({ key }) => ({ ok: true, result: String(key) }),
    });

    const result = await registry.executeTool("tool_a", { key: "value" });
    expect(result.ok).toBe(true);
    expect(result.result).toBe("value");
  });

  it("registers compact handlers via registerTool", () => {
    const registry = new ToolRegistry();
    registry.registerTool("tool_compact", () => ({ ok: true, result: 123 }));

    const specs = registry.listToolSpecs();
    expect(specs).toHaveLength(1);
    expect(specs[0]!.name).toBe("tool_compact");
    expect(specs[0]!.description).toBe("");
    expect(specs[0]!.tier).toBe("ga");
  });

  it("returns not_found envelope for missing tool", async () => {
    const registry = new ToolRegistry();
    const result = await registry.executeTool("missing", {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("not_found");
    expect(result.error?.message).toContain("not found");
  });

  it("returns invalid_argument for malformed input", async () => {
    const registry = new ToolRegistry();
    registry.registerTool("tool_input", () => ({ ok: true, result: "ok" }));
    const result = await registry.executeTool("tool_input", "bad input");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("invalid_argument");
    expect(result.error?.message).toBe("Tool input must be an object.");
  });

  it("normalizes thrown exceptions to internal_error", async () => {
    const registry = new ToolRegistry();
    registry.registerToolSpec({
      name: "tool_error",
      description: "Throws",
      inputSchema: {},
      handler: () => {
        throw new Error("boom");
      },
    });

    const result = await registry.executeTool("tool_error", {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("internal_error");
    expect(result.error?.message).toContain("boom");
  });

  it("adds service/operation metadata and opId on successful execution", async () => {
    const registry = new ToolRegistry();
    registry.registerToolSpec({
      name: "zoho_books_create_contact",
      description: "Creates",
      inputSchema: {},
      handler: ({ opId }) => ({ ok: true, result: { opId } }),
      tier: "ga",
      version: "v1",
      policyClass: "write-safe",
    });

    const result = await registry.executeTool("zoho_books_create_contact", {
      opId: "op-123",
      contact_id: "c1",
    });

    expect(result.service).toBe("books");
    expect(result.operation).toBe("create_contact");
    expect(result.opId).toBe("op-123");
    expect(result.result).toEqual({});
  });
});
