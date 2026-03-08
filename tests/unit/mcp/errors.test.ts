import { describe, expect, it } from "vitest";
import { ZohoApiError } from "../../../src/core/types.js";
import {
  MCP_ERROR_CODES,
  inferErrorCodeFromStatus,
  toErrorPayload,
} from "../../../src/mcp/errors.js";

describe("mcp errors", () => {
  it("maps Zoho error status to stable codes", () => {
    expect(inferErrorCodeFromStatus(400)).toBe(MCP_ERROR_CODES.invalid_argument);
    expect(inferErrorCodeFromStatus(404)).toBe(MCP_ERROR_CODES.not_found);
    expect(inferErrorCodeFromStatus(401)).toBe(MCP_ERROR_CODES.permission_denied);
    expect(inferErrorCodeFromStatus(429)).toBe(MCP_ERROR_CODES.rate_limited);
    expect(inferErrorCodeFromStatus(500)).toBe(MCP_ERROR_CODES.api_error);
    expect(inferErrorCodeFromStatus(200)).toBe(MCP_ERROR_CODES.api_error);
  });

  it("formats ZohoApiError as payload with details", () => {
    const err = new ZohoApiError("bad", 429, 100, { reason: "throttled" });
    const payload = toErrorPayload(err);
    expect(payload.code).toBe(MCP_ERROR_CODES.rate_limited);
    expect(payload.message).toBe("bad");
    expect(payload.details).toMatchObject({ status: 429, code: 100, reason: "throttled" });
  });

  it("falls back to internal_error for non-domain exceptions", () => {
    const payload = toErrorPayload(new Error("boom"));
    expect(payload.code).toBe(MCP_ERROR_CODES.internal_error);
    expect(payload.message).toContain("boom");
  });
});
