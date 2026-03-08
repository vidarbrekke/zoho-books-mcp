import { ToolRegistry } from "./server.js";
import { MCP_ERROR_CODES } from "./errors.js";

export interface MCPTransportOptions {
  maxInFlight?: number;
  maxQueueSize?: number;
  maxPayloadBytes?: number;
}

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    opId?: string;
  };
}

interface RpcEnvelope {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

interface QueuedTask {
  request: RpcRequest;
  resolve: (value: RpcEnvelope) => void;
}

const DEFAULT_MAX_IN_FLIGHT = 8;
const DEFAULT_MAX_QUEUE_SIZE = 32;
const DEFAULT_MAX_PAYLOAD_BYTES = 128_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rpcErrorResponse(id: string | number | null | undefined, errorCode: string, message: string): RpcEnvelope {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: errorCode,
      message,
    },
  };
}

function toToolsListPayload(specs: ReturnType<ToolRegistry["listToolSpecs"]>) {
  const tools = specs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema,
    tier: spec.tier ?? "ga",
    version: spec.version ?? "v1",
    policyClass: spec.policyClass ?? "default",
    service: spec.service ?? "books",
    operation: spec.operation ?? spec.name.replace(/^zoho_books_/, ""),
  }));

  return { tools };
}

function toInitializePayload() {
  return {
    protocolVersion: "2024-11-05",
    capabilities: { tools: { listChanged: false } },
    serverInfo: {
      name: "zoho-books-mcp",
      version: "0.1.0",
    },
  };
}

export class TransportCoordinator {
  private readonly registry: ToolRegistry;
  private readonly maxInFlight: number;
  private readonly maxQueueSize: number;
  private readonly maxPayloadBytes: number;
  private inFlight = 0;
  private readonly queue: QueuedTask[] = [];

  constructor(registry: ToolRegistry, options: MCPTransportOptions = {}) {
    this.registry = registry;
    this.maxInFlight = options.maxInFlight ?? DEFAULT_MAX_IN_FLIGHT;
    this.maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
    this.maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  }

  async handleRawRequest(raw: string): Promise<string> {
    if (raw.length > this.maxPayloadBytes) {
      return JSON.stringify(
        rpcErrorResponse(
          undefined,
          MCP_ERROR_CODES.invalid_argument,
          "Request payload too large."
        )
      );
    }

    let request: RpcRequest;
    try {
      const parsed = JSON.parse(raw);
      if (!isObject(parsed) || typeof parsed["method"] !== "string") {
        return JSON.stringify(
          rpcErrorResponse(undefined, MCP_ERROR_CODES.invalid_argument, "Invalid JSON-RPC request.")
        );
      }
      request = parsed as unknown as RpcRequest;
    } catch {
      return JSON.stringify(
        rpcErrorResponse(undefined, MCP_ERROR_CODES.invalid_argument, "Malformed JSON payload.")
      );
    }

    const response = await this.handleRequest(request);
    return JSON.stringify(response);
  }

  async handleRequestBatch(raw: string): Promise<string[]> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [JSON.stringify(rpcErrorResponse(undefined, MCP_ERROR_CODES.invalid_argument, "Malformed JSON payload."))];
    }

    if (!Array.isArray(parsed)) {
      return [await this.handleRawRequest(raw)];
    }

    const responses = await Promise.all(
      (parsed as RpcRequest[]).map((request) => this.handleRequest(request))
    );
    return responses.map((response) => JSON.stringify(response));
  }

  async handleRequest(request: RpcRequest): Promise<RpcEnvelope> {
    if (this.inFlight < this.maxInFlight) {
      return this.processRequestWithTracking(request);
    }

    if (this.queue.length >= this.maxQueueSize) {
      return rpcErrorResponse(
        request.id,
        MCP_ERROR_CODES.resource_exhausted,
        "tool call queue is full; retry later"
      );
    }

    return new Promise<RpcEnvelope>((resolve) => {
      this.queue.push({ request, resolve });
    });
  }

  private async processRequestWithTracking(request: RpcRequest): Promise<RpcEnvelope> {
    this.inFlight += 1;
    try {
      return await this.processRequest(request);
    } finally {
      this.inFlight -= 1;
      this.drainQueue();
    }
  }

  private async processRequest(request: RpcRequest): Promise<RpcEnvelope> {
    const id = request.id;
    if (typeof request.method !== "string") {
      return rpcErrorResponse(id, MCP_ERROR_CODES.invalid_argument, "Request method is required.");
    }

    try {
      switch (request.method) {
        case "initialize": {
          return {
            jsonrpc: "2.0",
            id,
            result: toInitializePayload(),
          };
        }
        case "tools/list": {
          return {
            jsonrpc: "2.0",
            id,
            result: toToolsListPayload(this.registry.listToolSpecs()),
          };
        }
        case "tools/call": {
          const name = typeof request.params?.name === "string" ? request.params.name : "";
          const args = isObject(request.params?.arguments)
            ? (request.params?.arguments as Record<string, unknown>)
            : {};
          const opId =
            typeof request.params?.opId === "string" && request.params.opId.trim()
              ? request.params.opId.trim()
              : undefined;
          const envelope = await this.registry.executeTool(name, opId ? { ...args, opId } : args);
          return {
            jsonrpc: "2.0",
            id,
            result: envelope,
          };
        }
        default:
          return rpcErrorResponse(id, MCP_ERROR_CODES.invalid_argument, `Unknown method: ${request.method}`);
      }
    } catch (error) {
      return rpcErrorResponse(id, MCP_ERROR_CODES.internal_error, (error as Error).message ?? "Unexpected error");
    }
  }

  private drainQueue(): void {
    while (this.inFlight < this.maxInFlight && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) {
        return;
      }
      void this.processRequestWithTracking(next.request).then((response) => next.resolve(response));
    }
  }
}
