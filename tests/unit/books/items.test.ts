import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearConfigCache, loadConfig } from "../../../src/core/config.js";
import { listItemsTool, getItemTool } from "../../../src/books/tools/items.js";
import { ZohoApiError } from "../../../src/core/types.js";

const { mockListItems, mockGetItem } = vi.hoisted(() => ({
  mockListItems: vi.fn(),
  mockGetItem: vi.fn(),
}));
vi.mock("../../../src/books/client.js", () => ({
  ZohoBooksClient: class {
    listItems = mockListItems;
    getItem = mockGetItem;
  },
}));

describe("items tools", () => {
  beforeEach(() => {
    mockListItems.mockReset();
    mockGetItem.mockReset();
    clearConfigCache();
    process.env.ZOHO_CLIENT_ID = "id";
    process.env.ZOHO_CLIENT_SECRET = "s";
    process.env.ZOHO_REFRESH_TOKEN = "r";
    process.env.ZOHO_ORG_ID = "o";
    process.env.ZOHO_REGION = "US";
    loadConfig();
  });

  describe("listItemsTool", () => {
    it("returns shaped list (success path)", async () => {
      mockListItems.mockResolvedValueOnce({
        items: [{ item_id: "item_1", name: "Widget" }],
      });
      const result = await listItemsTool.handler({});
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].item_id).toBe("item_1");
    });

    it("returns formatted error when API fails", async () => {
      mockListItems.mockRejectedValueOnce(new ZohoApiError("Rate limited", 429, 0));
      const result = await listItemsTool.handler({});
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });
  });

  describe("getItemTool", () => {
    it("returns single item (success path)", async () => {
      mockGetItem.mockResolvedValueOnce({
        item_id: "item_1",
        name: "Widget",
        rate: 99,
      });
      const result = await getItemTool.handler({ item_id: "item_1" });
      expect(result.isError).toBeFalsy();
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      const parsed = JSON.parse(text);
      expect(parsed.item_id).toBe("item_1");
      expect(parsed.name).toBe("Widget");
    });

    it("returns formatted error when get API fails", async () => {
      mockGetItem.mockRejectedValueOnce(
        new ZohoApiError("Item not found", 404, 0)
      );
      const result = await getItemTool.handler({ item_id: "bad_id" });
      expect(result.isError).toBe(true);
      const text = result.content[0].type === "text" ? result.content[0].text : "";
      expect(text).toContain("Zoho API error");
    });
  });
});
