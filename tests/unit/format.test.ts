import { describe, expect, it } from "vitest";
import { catalogHref } from "@/lib/catalog-url";
import { formatPrice } from "@/lib/format";

describe("formatPrice", () => {
  it("formats shekels from agorot, with decimals only when needed", () => {
    expect(formatPrice(125000, "ILS")).toBe("₪1,250");
    expect(formatPrice(125050, "ILS")).toBe("₪1,250.50");
    expect(formatPrice(99, "ILS")).toBe("₪0.99");
  });
});

describe("catalogHref", () => {
  it("leaves out defaults so links stay short", () => {
    expect(catalogHref("/products", {})).toBe("/products");
    expect(catalogHref("/products", { sort: "featured", page: 1 })).toBe("/products");
  });
  it("encodes filters, sort and page", () => {
    expect(catalogHref("/products", { q: "حبر أسود", category: "toners", brand: "hp", sort: "name", page: 3 }))
      .toBe("/products?q=%D8%AD%D8%A8%D8%B1+%D8%A3%D8%B3%D9%88%D8%AF&category=toners&brand=hp&sort=name&page=3");
  });
});
