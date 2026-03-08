import { ZohoApiError } from "../core/types.js";
import type { ErrorCode, ErrorEnvelope } from "./types.js";

export const MCP_ERROR_CODES = {
  invalid_argument: "invalid_argument",
  not_found: "not_found",
  permission_denied: "permission_denied",
  rate_limited: "rate_limited",
  unavailable: "unavailable",
  internal_error: "internal_error",
  api_error: "api_error",
  resource_exhausted: "resource_exhausted",
} as const;

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const PERMISSION_STATUSES = new Set([401, 403]);

export function toErrorPayload(error: unknown): ErrorEnvelope {
  if (error instanceof ZohoApiError) {
    return {
      code: inferErrorCodeFromStatus(error.status),
      message: error.message,
      details: { status: error.status, code: error.code, ...error.details },
    };
  }

  if (error instanceof Error) {
    return {
      code: MCP_ERROR_CODES.internal_error,
      message: error.message || "Unexpected error",
    };
  }

  return {
    code: MCP_ERROR_CODES.internal_error,
    message: String(error),
  };
}

export function inferErrorCodeFromStatus(status: number): ErrorCode {
  if (status === 400 || status === 422) return MCP_ERROR_CODES.invalid_argument;
  if (status === 404) return MCP_ERROR_CODES.not_found;
  if (PERMISSION_STATUSES.has(status)) return MCP_ERROR_CODES.permission_denied;
  if (status === 429) return MCP_ERROR_CODES.rate_limited;
  if (RETRYABLE_STATUSES.has(status)) return MCP_ERROR_CODES.api_error;
  return MCP_ERROR_CODES.api_error;
}

