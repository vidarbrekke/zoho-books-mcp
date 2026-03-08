import type { ToolHandler, ToolInputSchema, ToolSpec } from "./types.js";

export const DEFAULT_TOOL_TIER = "ga";
export const DEFAULT_TOOL_VERSION = "v1";
export const DEFAULT_POLICY_CLASS = "read-write";

export interface RegisterToolInput<TResult = unknown> {
  name: string;
  description: string;
  inputSchema?: ToolInputSchema;
  handler: ToolHandler<TResult>;
  tier?: string;
  version?: string;
  policyClass?: string;
  service?: string;
  operation?: string;
}

export function normalizeToolName(name: string): string {
  return name.trim();
}

export function normalizeToolSpec<TResult>(input: RegisterToolInput<TResult>): ToolSpec<TResult> {
  const name = normalizeToolName(input.name);
  if (!name) {
    throw new Error("Tool registration requires a non-empty name.");
  }

  return {
    name,
    description: input.description.trim(),
    inputSchema: input.inputSchema ?? {},
    handler: input.handler,
    tier: input.tier ?? DEFAULT_TOOL_TIER,
    version: input.version ?? DEFAULT_TOOL_VERSION,
    policyClass: input.policyClass ?? DEFAULT_POLICY_CLASS,
    service: input.service,
    operation: input.operation,
  };
}
