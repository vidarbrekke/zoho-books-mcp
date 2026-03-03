import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearConfigCache, loadConfig } from "../../../src/core/config.js";
import { listContactsTool, getContactTool } from "../../../src/books/tools/contacts.js";
import { ZohoApiError } from "../../../src/core/types.js";

const { mockListContacts, mockGetContact } = vi.hoisted(() => ({
  mockListContacts: vi.fn(),
  mockGetContact: vi.fn(),
}));
vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    listContacts = mockListContacts;
    getContact = mockGetContact;
  },
}));

describe("contacts tools", () => {
  beforeEach(() => {
    mockListContacts.mockReset();
    mockGetContact.mockReset();
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  describe("listContactsTool", () => {
    it("returns shaped list (success path)", async () => {
      mockListContacts.mockResolvedValueOnce({
        contacts: [{ contact_id: "c_1", contact_name: "Acme" }],
      });
      const result = await listContactsTool.handler({});
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].contact_id).toBe("c_1");
    });

    it("returns formatted error when API fails", async () => {
      mockListContacts.mockRejectedValueOnce(new ZohoApiError("Unauthorized", 401, 0));
      const result = await listContactsTool.handler({});
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
      expect(text).toContain("401");
    });
  });

  describe("getContactTool", () => {
    it("returns single contact (success path)", async () => {
      mockGetContact.mockResolvedValueOnce({
        contact_id: "c_1",
        contact_name: "Acme",
        contact_type: "customer",
      });
      const result = await getContactTool.handler({ contact_id: "c_1" });
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed.contact_id).toBe("c_1");
      expect(parsed.contact_name).toBe("Acme");
    });

    it("returns formatted error when get API fails", async () => {
      mockGetContact.mockRejectedValueOnce(
        new ZohoApiError("Contact not found", 404, 0)
      );
      const result = await getContactTool.handler({ contact_id: "bad_id" });
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });
  });
});
