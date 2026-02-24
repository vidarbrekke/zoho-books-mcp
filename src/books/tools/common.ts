import { z } from "zod";
import { getConfig } from "../../core/config.js";
import { ZohoApiError } from "../../core/types.js";

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format");

function pickFields(
  item: Record<string, unknown>,
  fields?: string[]
): Record<string, unknown> {
  if (!fields || fields.length === 0) return item;
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in item) out[f] = item[f];
  }
  return out;
}

export function shapeListResponse(params: {
  list: unknown[];
  fields?: string[];
  summary?: boolean;
  totalHint?: number;
}): unknown {
  const filtered = params.list.map((v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return pickFields(v as Record<string, unknown>, params.fields);
    }
    return v;
  });
  if (!params.summary) return filtered;
  return {
    count: filtered.length,
    total_hint: params.totalHint,
    items: filtered.slice(0, 10),
  };
}

export function shapeObjectResponse(
  object: unknown,
  fields?: string[],
  summary?: boolean
): unknown {
  if (!object || typeof object !== "object" || Array.isArray(object)) {
    return object;
  }
  const filtered = pickFields(object as Record<string, unknown>, fields);
  if (!summary) return filtered;
  return { keys: Object.keys(filtered), item: filtered };
}

export function formatToolError(error: unknown): string {
  if (error instanceof ZohoApiError) {
    const details =
      error.details && Object.keys(error.details).length > 0
        ? ` details=${JSON.stringify(error.details)}`
        : "";
    return `Zoho API error: status=${error.status} code=${
      error.code ?? "unknown"
    } message=${error.message}${details}`;
  }
  return `Error: ${String(error)}`;
}

export function assertWriteAllowed(): void {
  if (getConfig().readOnly) {
    throw new Error(
      "Write tools are disabled (ZOHO_READ_ONLY is enabled). Set ZOHO_READ_ONLY=0 to allow writes."
    );
  }
}
