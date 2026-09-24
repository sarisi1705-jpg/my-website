import { describe, expect, it } from "vitest";
import { buildSearchText, escapeLike, normalizeArabic, searchTerms } from "@/lib/search/normalize";
import { slugify } from "@/lib/slug";
import { parseCatalogQuery } from "@/lib/validation/catalog";

describe("normalizeArabic", () => {
  it.each([
    ["طابعة", "طابعه"],
    ["أحبار", "احبار"],
    ["إصلاح", "اصلاح"],
    ["آلة", "اله"],
    ["على", "علي"],
    ["مسؤول", "مسوول"],
    ["قارئ", "قاري"],
    ["طِبَاعَة", "طباعه"],
    ["طبـــاعة", "طباعه"],
    ["ورق ٨٠ غرام", "ورق 80 غرام"],
    ["  LaserJet   PRO ", "laserjet pro"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeArabic(input)).toBe(expected);
  });
});

describe("searchTerms", () => {
  it("normalizes, de-duplicates and caps terms", () => {
    expect(searchTerms(" طابعة  طابعه HP ")).toEqual(["طابعه", "hp"]);
    expect(searchTerms("a b c d e f g h")).toHaveLength(6);
    expect(searchTerms("   ")).toEqual([]);
  });
});

describe("buildSearchText / escapeLike", () => {
  it("combines all searchable fields", () => {
    expect(buildSearchText({ name: "تونر أسود", model: "W2031A", brand: "HP", category: "الأحبار والتونر", specs: ["ليزر"] }))
      .toBe("تونر اسود w2031a hp الاحبار والتونر ليزر");
  });
  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\x")).toBe("50\\%\\_off\\\\x");
  });
});

describe("slugify", () => {
  it.each([
    ["Xerox VersaLink B415", "xerox-versalink-b415"],
    ["Canon GI-490 C/M/Y", "canon-gi-490-c-m-y"],
    ["Navigator A4 — 80 gsm", "navigator-a4-80-gsm"],
    ["طابعة HP ١٠٢", "hp-102"],
    ["طابعة", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("parseCatalogQuery", () => {
  it("applies defaults", () => {
    expect(parseCatalogQuery({})).toEqual({ featured: false, sort: "featured", page: 1, pageSize: 24 });
  });
  it("clamps and ignores bad values instead of failing", () => {
    expect(parseCatalogQuery({ page: "-3", pageSize: "500", sort: "price", q: "  " })).toMatchObject({ page: 1, pageSize: 48, sort: "featured", q: undefined });
    expect(parseCatalogQuery({ page: "abc" }).page).toBe(1);
  });
  it("reads URLSearchParams and the first of repeated values", () => {
    expect(parseCatalogQuery(new URLSearchParams("q=ليزر&category=printers&featured=1&sort=name&page=2")))
      .toMatchObject({ q: "ليزر", category: "printers", featured: true, sort: "name", page: 2 });
    expect(parseCatalogQuery({ brand: ["hp", "epson"] }).brand).toBe("hp");
  });
});
