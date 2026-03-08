import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface DebugEvent {
  event: "initialize" | "tools/list" | "tools/call" | string;
  method?: string;
  id?: string | number | null;
  service?: string;
  operation?: string;
  opId?: string;
  status?: "ok" | "error";
  error?: string;
}

const LOG_ENV = "ZOHO_MCP_DEBUG_LOG";

function normalizePayload(event: DebugEvent): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    event: event.event,
    method: event.method,
    id: event.id,
    service: event.service,
    operation: event.operation,
    opId: event.opId,
    status: event.status,
    error: event.error,
  });
}

export function logDebugEvent(event: DebugEvent): void {
  const file = process.env[LOG_ENV];
  if (!file || !file.trim()) return;
  const filePath = file.trim();
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    appendFileSync(filePath, normalizePayload(event) + "\n", { encoding: "utf8" });
  } catch {
    // debug logging is intentionally best-effort
  }
}
