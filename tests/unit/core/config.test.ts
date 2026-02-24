import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, clearConfigCache } from "../../../src/core/config.js";

describe("loadConfig", () => {
  const origEnv = process.env;

  beforeEach(() => {
    clearConfigCache();
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("throws when ZOHO_CLIENT_ID is missing", () => {
    delete process.env.ZOHO_CLIENT_ID;
    process.env.ZOHO_CLIENT_SECRET = "secret";
    process.env.ZOHO_REFRESH_TOKEN = "refresh";
    process.env.ZOHO_ORG_ID = "123";
    expect(() => loadConfig()).toThrow("Missing or empty required env: ZOHO_CLIENT_ID");
  });

  it("throws when ZOHO_REGION is invalid", () => {
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "secret";
    process.env.ZOHO_REFRESH_TOKEN = "refresh";
    process.env.ZOHO_ORG_ID = "123";
    process.env.ZOHO_REGION = "XX";
    expect(() => loadConfig()).toThrow('Invalid ZOHO_REGION');
  });

  it("returns frozen config with correct apiHost for US", () => {
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "secret";
    process.env.ZOHO_REFRESH_TOKEN = "refresh";
    process.env.ZOHO_ORG_ID = "123";
    process.env.ZOHO_REGION = "US";
    const config = loadConfig();
    expect(config.clientId).toBe("id");
    expect(config.orgId).toBe("123");
    expect(config.region).toBe("US");
    expect(config.apiHost).toBe("www.zohoapis.com");
    expect(config.accountsHost).toBe("accounts.zoho.com");
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("returns correct apiHost for EU", () => {
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "secret";
    process.env.ZOHO_REFRESH_TOKEN = "refresh";
    process.env.ZOHO_ORG_ID = "123";
    process.env.ZOHO_REGION = "EU";
    const config = loadConfig();
    expect(config.apiHost).toBe("www.zohoapis.eu");
    expect(config.accountsHost).toBe("accounts.zoho.eu");
  });

  it("defaults ZOHO_READ_ONLY to true", () => {
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "secret";
    process.env.ZOHO_REFRESH_TOKEN = "refresh";
    process.env.ZOHO_ORG_ID = "123";
    process.env.ZOHO_REGION = "US";
    delete process.env.ZOHO_READ_ONLY;
    const config = loadConfig();
    expect(config.readOnly).toBe(true);
  });

  it("sets ZOHO_READ_ONLY false when env is 0", () => {
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "secret";
    process.env.ZOHO_REFRESH_TOKEN = "refresh";
    process.env.ZOHO_ORG_ID = "123";
    process.env.ZOHO_REGION = "US";
    process.env.ZOHO_READ_ONLY = "0";
    const config = loadConfig();
    expect(config.readOnly).toBe(false);
  });
});
