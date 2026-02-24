/**
 * Config: validate at startup, expose frozen object.
 * See docs/DECISIONS.md §1.
 */

import type { ZohoRegion } from "./types.js";

const REGIONS: ZohoRegion[] = ["US", "EU", "IN", "AU", "JP", "CA"];

/** API domain per region (Books and other zohoapis.com products). */
const API_HOST: Record<ZohoRegion, string> = {
  US: "www.zohoapis.com",
  EU: "www.zohoapis.eu",
  IN: "www.zohoapis.in",
  AU: "www.zohoapis.com.au",
  JP: "www.zohoapis.jp",
  CA: "www.zohoapis.ca",
};

/** Accounts domain per region (OAuth token endpoint). */
const ACCOUNTS_HOST: Record<ZohoRegion, string> = {
  US: "accounts.zoho.com",
  EU: "accounts.zoho.eu",
  IN: "accounts.zoho.in",
  AU: "accounts.zoho.com.au",
  JP: "accounts.zoho.jp",
  CA: "accounts.zoho.ca",
};

export interface ZohoConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly orgId: string;
  readonly region: ZohoRegion;
  readonly apiHost: string;
  readonly accountsHost: string;
  readonly readOnly: boolean;
}

let cached: ZohoConfig | null = null;

/** Reset cached config (for tests only). */
export function clearConfigCache(): void {
  cached = null;
}

function parseRegion(value: string): ZohoRegion {
  const upper = value.trim().toUpperCase();
  if (REGIONS.includes(upper as ZohoRegion)) return upper as ZohoRegion;
  throw new Error(
    `Invalid ZOHO_REGION: "${value}". Must be one of: ${REGIONS.join(", ")}`
  );
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v.trim() === "") {
    throw new Error(`Missing or empty required env: ${name}`);
  }
  return v.trim();
}

function parseReadOnly(value: string | undefined): boolean {
  if (value === undefined) return true;
  const normalized = value.trim().toLowerCase();
  if (normalized === "0" || normalized === "false" || normalized === "off") {
    return false;
  }
  return true;
}

/**
 * Load and validate config from environment. Call once at startup.
 * Returns frozen config object.
 */
export function loadConfig(): ZohoConfig {
  if (cached) return cached;

  const clientId = requireEnv("ZOHO_CLIENT_ID");
  const clientSecret = requireEnv("ZOHO_CLIENT_SECRET");
  const refreshToken = requireEnv("ZOHO_REFRESH_TOKEN");
  const orgId = requireEnv("ZOHO_ORG_ID");
  const region = parseRegion(process.env["ZOHO_REGION"] ?? "US");
  const readOnly = parseReadOnly(process.env["ZOHO_READ_ONLY"]);

  const config: ZohoConfig = Object.freeze({
    clientId,
    clientSecret,
    refreshToken,
    orgId,
    region,
    apiHost: API_HOST[region],
    accountsHost: ACCOUNTS_HOST[region],
    readOnly,
  });

  cached = config;
  return config;
}

/**
 * Return current config. Throws if loadConfig() has not been called yet.
 */
export function getConfig(): ZohoConfig {
  if (!cached) {
    throw new Error("Config not loaded. Call loadConfig() first (e.g. at startup).");
  }
  return cached;
}
