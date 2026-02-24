/**
 * Config: validate at startup, expose frozen object.
 * Loads from OPENCLAW_SECRETS_DIR/zoho-books-mcp.json (or env), then overlays env.
 * See docs/DECISIONS.md §1.
 */

import fs from "node:fs";
import path from "node:path";
import type { ZohoRegion } from "./types.js";

const REGIONS: ZohoRegion[] = ["US", "EU", "IN", "AU", "JP", "CA"];

const SECRETS_FILENAME = "zoho-books-mcp.json";

function getSecretsDir(): string {
  if (process.env["OPENCLAW_SECRETS_DIR"]) {
    return path.resolve(process.env["OPENCLAW_SECRETS_DIR"]);
  }
  const home = process.env["USERPROFILE"] || process.env["HOME"] || ".";
  return path.join(home, ".openclaw", "secrets");
}

function loadSecretsFile(): Record<string, string> {
  const dir = getSecretsDir();
  const filePath = path.join(dir, SECRETS_FILENAME);
  if (!fs.existsSync(filePath)) return {};
  try {
    ensureFileMode(filePath, 0o600);
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "string" && v.trim() !== "") out[k] = v.trim();
    }
    return out;
  } catch (e) {
    throw new Error(
      `Failed to load secrets file at ${filePath}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/** Set file to mode if it exists; repair if current mode is too open. */
export function ensureFileMode(filePath: string, mode: number): void {
  try {
    if (!fs.existsSync(filePath)) return;
    const stats = fs.statSync(filePath);
    const current = stats.mode & 0o777;
    if (current !== mode) {
      fs.chmodSync(filePath, mode);
    }
  } catch {
    // ignore
  }
}

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

function requireEnv(name: string, fileCfg: Record<string, string>): string {
  const v = process.env[name] ?? fileCfg[name];
  if (v === undefined || String(v).trim() === "") {
    throw new Error(
      `Missing or empty required config: ${name}. Set env or add to ${path.join(getSecretsDir(), SECRETS_FILENAME)}.`
    );
  }
  return String(v).trim();
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

  const fileCfg = loadSecretsFile();

  const clientId = requireEnv("ZOHO_CLIENT_ID", fileCfg);
  const clientSecret = requireEnv("ZOHO_CLIENT_SECRET", fileCfg);
  const refreshToken = requireEnv("ZOHO_REFRESH_TOKEN", fileCfg);
  const orgId = requireEnv("ZOHO_ORG_ID", fileCfg);
  const region = parseRegion(
    process.env["ZOHO_REGION"] ?? fileCfg["ZOHO_REGION"] ?? "US"
  );
  const readOnly = parseReadOnly(
    process.env["ZOHO_READ_ONLY"] ?? fileCfg["ZOHO_READ_ONLY"]
  );

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
