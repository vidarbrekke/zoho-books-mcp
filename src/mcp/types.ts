export type ToolInputSchema = {
  [key: string]: unknown;
};

export type ErrorCode =
  | "invalid_argument"
  | "not_found"
  | "permission_denied"
  | "rate_limited"
  | "unavailable"
  | "internal_error"
  | "api_error"
  | "resource_exhausted";

export interface ErrorEnvelope {
  code: ErrorCode | string;
  message: string;
  details?: unknown;
}

export interface Envelope<TResult = unknown> {
  ok: boolean;
  service?: string;
  operation?: string;
  opId?: string;
  result?: TResult;
  error?: ErrorEnvelope;
}

export type ToolHandler<TResult = unknown> = (
  input: Record<string, unknown>
) => Promise<Envelope<TResult> | unknown> | Envelope<TResult> | unknown;

export interface ToolSpec<TResult = unknown> {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  handler: ToolHandler<TResult>;
  tier?: string;
  version?: string;
  policyClass?: string;
  service?: string;
  operation?: string;
}
