/**
 * Shared types for Zoho API and MCP layer.
 */

/** Zoho API error response shape (v3). */
export interface ZohoErrorBody {
  code?: number;
  message?: string;
  details?: Record<string, unknown>;
}

/** Thrown on non-2xx responses; includes status and parsed Zoho error when available. */
export class ZohoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ZohoApiError";
    Object.setPrototypeOf(this, ZohoApiError.prototype);
  }
}

/** Paginated list response common to many Books endpoints. */
export interface ZohoPaginatedResponse<T> {
  page_context?: {
    page: number;
    per_page: number;
    has_more_page: boolean;
    applied_filter: string;
    sort_column?: string;
    sort_order?: string;
  };
  [key: string]: T[] | number | string | { page: number; per_page: number; has_more_page: boolean; applied_filter: string; sort_column?: string; sort_order?: string } | undefined;
}

/** Supported Zoho API regions (datacenter). */
export type ZohoRegion = "US" | "EU" | "IN" | "AU" | "JP" | "CA";
