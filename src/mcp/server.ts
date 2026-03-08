import {
  type Envelope,
  type ErrorCode,
  type ToolHandler,
  type ToolSpec,
} from "./types.js";
import { DEFAULT_TOOL_TIER, normalizeToolSpec } from "./tool.js";

type RegistryMap = Map<string, ToolSpec>;

export interface ListToolsOptions {
  deterministic?: boolean;
}

export interface ExecutableToolRegistry {
  registerToolSpec<TResult>(spec: ToolSpec<TResult>): void;
  registerTool<TResult>(name: string, handler: ToolHandler<TResult>): void;
  listToolSpecs(options?: ListToolsOptions): ToolSpec[];
  executeTool<TResult>(name: string, input: unknown): Promise<Envelope<TResult>>;
}

export class ToolRegistry implements ExecutableToolRegistry {
  private readonly specs: RegistryMap = new Map();

  registerToolSpec<TResult>(spec: ToolSpec<TResult>): void {
    const normalized = normalizeToolSpec(spec);
    if (this.specs.has(normalized.name)) {
      throw new Error(`Tool "${normalized.name}" is already registered.`);
    }

    this.specs.set(normalized.name, normalized);
  }

  registerTool<TResult>(name: string, handler: ToolHandler<TResult>): void {
    this.registerToolSpec({
      name,
      description: "",
      inputSchema: {},
      handler,
      tier: DEFAULT_TOOL_TIER,
      version: "v1",
      policyClass: "default",
    });
  }

  listToolSpecs(options: ListToolsOptions = { deterministic: true }): ToolSpec[] {
    const entries = Array.from(this.specs.values());
    if (options.deterministic === false) {
      return entries;
    }
    return [...entries].sort((a, b) => a.name.localeCompare(b.name));
  }

  async executeTool<TResult>(name: string, input: unknown): Promise<Envelope<TResult>> {
    const normalizedName = name.trim();
    const requestContext = normalizeToolContext(input);
    if (!normalizedName) {
      return this.errorEnvelope({
        code: "invalid_argument",
        message: "Tool name is required.",
      }) as Envelope<TResult>;
    }

    const spec = this.specs.get(normalizedName);
    if (!spec) {
      return this.errorEnvelope({
        code: "not_found",
        message: `Tool "${normalizedName}" not found.`,
      }) as Envelope<TResult>;
    }

    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return this.errorEnvelope({
        code: "invalid_argument",
        message: "Tool input must be an object.",
      }) as Envelope<TResult>;
    }

    try {
      const result = await spec.handler(requestContext.cleanedInput);
      if (this.isEnvelope(result)) {
        return {
          ...result,
          service: spec.service ?? "books",
          operation: spec.operation ?? deriveOperationFromName(spec.name),
          opId: requestContext.opId,
        } as Envelope<TResult>;
      }

      return {
        ok: true,
        service: spec.service ?? "books",
        operation: spec.operation ?? deriveOperationFromName(spec.name),
        opId: requestContext.opId,
        result: result as TResult,
      } as Envelope<TResult>;
    } catch (error) {
      return this.errorEnvelope({
        code: "internal_error",
        message: this.errorMessage(error),
      }) as Envelope<TResult>;
    }
  }

  private errorEnvelope(details: { code: ErrorCode | string; message: string }): Envelope {
    return {
      ok: false,
      error: {
        code: details.code,
        message: details.message,
      },
    };
  }

  private isEnvelope(value: unknown): value is Envelope<unknown> {
    return (
      typeof value === "object" &&
      value !== null &&
      "ok" in value &&
      typeof (value as Envelope).ok === "boolean"
    );
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

function normalizeToolContext(rawInput: unknown): {
  cleanedInput: Record<string, unknown>;
  opId?: string;
} {
  if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return { cleanedInput: {} };
  }

  const input = rawInput as Record<string, unknown>;
  const opId = typeof input.opId === "string" && input.opId.trim() ? input.opId.trim() : undefined;
  const cleanedInput = { ...input };
  if ("opId" in cleanedInput) {
    delete cleanedInput.opId;
  }

  return {
    cleanedInput,
    opId,
  };
}

function deriveOperationFromName(name: string): string {
  const prefix = "zoho_books_";
  if (name.startsWith(prefix)) {
    return name.slice(prefix.length);
  }
  return name;
}
