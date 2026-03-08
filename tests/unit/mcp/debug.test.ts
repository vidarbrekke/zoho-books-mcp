import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logDebugEvent } from "../../../src/mcp/debug.js";

describe("mcp debug logging", () => {
  let dir: string;
  let logPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "zoho-mcp-debug-"));
    logPath = join(dir, "events.log");
  });

  afterEach(() => {
    process.env.ZOHO_MCP_DEBUG_LOG = undefined;
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes one-line JSON records when enabled", () => {
    process.env.ZOHO_MCP_DEBUG_LOG = logPath;
    writeFileSync(logPath, "", { encoding: "utf8" });

    logDebugEvent({
      event: "tools/call",
      method: "tools/call",
      opId: "op-123",
      service: "books",
      operation: "get_invoice",
      status: "ok",
    });

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const payload = JSON.parse(lines[0]!);
    expect(payload.event).toBe("tools/call");
    expect(payload.opId).toBe("op-123");
    expect(payload.service).toBe("books");
    expect(payload.operation).toBe("get_invoice");
  });

  it("is a no-op when debug path is not configured", () => {
    process.env.ZOHO_MCP_DEBUG_LOG = "";
    expect(() =>
      logDebugEvent({
        event: "initialize",
        method: "initialize",
        status: "ok",
      })
    ).not.toThrow();
  });
});
