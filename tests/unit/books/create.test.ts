import { beforeEach, describe, expect, it, vi } from "vitest";
import { createContactTool } from "../../../src/books/tools/create.js";
import { clearConfigCache, loadConfig } from "../../../src/core/config.js";

vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    createContact = vi.fn().mockResolvedValue({ contact_id: "c_1" });
  },
}));

describe("createContactTool read-only guard", () => {
  beforeEach(() => {
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    process.env.ZOHO_READ_ONLY = "1";
    loadConfig();
  });

  it("blocks writes when ZOHO_READ_ONLY is enabled", async () => {
    const result = await createContactTool.handler({
      contact_name: "Jane Doe",
      contact_type: "customer",
    });
    expect(result.isError).toBe(true);
    const text = result.content[0].type === "text" ? result.content[0].text : "";
    expect(text).toContain("Write tools are disabled");
  });
});
