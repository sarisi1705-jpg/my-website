import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { brands, products } from "@/db/schema";
import type { Db } from "@/db/types";
import {
  getProductBySlug, getPublishedProductById, getRelatedProducts, listBrands, listCategoriesWithCounts,
  listProducts, listPublishedSlugs, resolveCategoryParam,
} from "@/lib/server/catalog";
import { parseCatalogQuery } from "@/lib/validation/catalog";
import { createTestDb } from "./setup";

const list = (db: Db, params: Record<string, string> = {}) => listProducts(db, parseCatalogQuery(params));
const names = async (db: Db, params: Record<string, string>) => (await list(db, params)).items.map(item => item.model);

describe("catalog (seeded data)", () => {
  let db: Db;
  let dispose: () => Promise<void>;
  beforeAll(async () => ({ db, dispose } = await createTestDb()));
  afterAll(async () => dispose?.());

  it("lists all 16 seeded products, featured first", async () => {
    const page = await list(db);
    expect(page.total).toBe(16);
    expect(page.items).toHaveLength(16);
    expect(page.items.slice(0, 3).every(item => item.featured)).toBe(true);
    expect(page.items[0]).toMatchObject({
      slug: "xerox-versalink-b415", brand: { slug: "xerox", name: "Xerox" },
      category: { slug: "printers", name: "الطابعات", iconKey: "printer" }, priceMinor: null, currency: "ILS",
    });
  });

  it("paginates", async () => {
    const page4 = await list(db, { pageSize: "5", page: "4" });
    expect(page4).toMatchObject({ total: 16, page: 4, pageSize: 5, pageCount: 4 });
    expect(page4.items).toHaveLength(1);
    expect((await list(db, { pageSize: "5", page: "9" })).items).toHaveLength(0);
  });

  it("matches Arabic spelling variants", async () => {
    const withTaaMarbuta = await names(db, { q: "طابعة" });
    expect(withTaaMarbuta).toEqual(await names(db, { q: "طابعه" }));
    expect(withTaaMarbuta).toContain("VersaLink B415");
    expect(await names(db, { q: "احبار" })).toEqual(await names(db, { q: "أحبار" }));
  });

  it("searches models case-insensitively, with Arabic digits, and requires every term", async () => {
    // The printer, its toner and a feed roller all mention LaserJet.
    expect(await names(db, { q: "laserjet", sort: "name" })).toEqual(await names(db, { q: "LASERJET", sort: "name" }));
    expect(await names(db, { q: "laserjet" })).toEqual(["LaserJet Pro 4103fdw", "W2031A", "RM2-5392"]);
    expect(await names(db, { q: "laserjet 4103" })).toEqual(["LaserJet Pro 4103fdw"]);
    expect(await names(db, { q: "٨٠ gsm" })).toEqual(["A4 — 80 gsm"]);
    expect(await names(db, { q: "ورق لامع" })).toEqual(["A4 — 200 gsm"]);
    expect(await names(db, { q: "ليزر كانون-غير-موجود" })).toEqual([]);
  });

  it("treats LIKE wildcards literally", async () => {
    expect((await list(db, { q: "%" })).total).toBe(0);
    expect((await list(db, { q: "_" })).total).toBe(0);
  });

  it("filters by category, brand and featured", async () => {
    expect((await list(db, { category: "printers" })).total).toBe(4);
    expect((await list(db, { category: "solutions" })).total).toBe(0);
    expect(await names(db, { brand: "epson", sort: "name" })).toHaveLength(4);
    expect((await list(db, { featured: "1" })).total).toBe(3);
    expect((await list(db, { category: "printers", brand: "hp" })).items.map(item => item.slug)).toEqual(["hp-laserjet-pro-4103fdw"]);
  });

  it("sorts by name and by newest", async () => {
    const byName = (await list(db, { sort: "name" })).items.map(item => item.name);
    expect(byName).toEqual([...byName].sort());
    expect((await list(db, { sort: "newest" })).items[0].id).toBe(16);
  });

  it("counts published products per active category", async () => {
    const counts = Object.fromEntries((await listCategoriesWithCounts(db)).map(category => [category.slug, category.productCount]));
    expect(counts).toEqual({ printers: 4, toners: 4, parts: 4, paper: 4, solutions: 0 });
  });

  it("lists active brands in order", async () => {
    expect((await listBrands(db)).map(brand => brand.slug)).toEqual(["xerox", "epson", "hp", "canon", "navigator", "avery"]);
  });

  it("resolves category slugs, display names and legacy names", async () => {
    expect(await resolveCategoryParam(db, "printers")).toBe("printers");
    expect(await resolveCategoryParam(db, "PRINTERS")).toBe("printers");
    expect(await resolveCategoryParam(db, "طابعات")).toBe("printers");
    expect(await resolveCategoryParam(db, "الأحبار والتونر")).toBe("toners");
    expect(await resolveCategoryParam(db, "الاحبار والتونر")).toBe("toners");
    expect(await resolveCategoryParam(db, "nope")).toBeUndefined();
    expect(await resolveCategoryParam(db, undefined)).toBeUndefined();
  });

  it("finds products and related products", async () => {
    const product = await getProductBySlug(db, "hp-laserjet-pro-4103fdw");
    expect(product?.id).toBe(3);
    expect((await getPublishedProductById(db, 3))?.slug).toBe("hp-laserjet-pro-4103fdw");
    const related = await getRelatedProducts(db, product!);
    expect(related).toHaveLength(3);
    expect(related.every(item => item.category.slug === "printers" && item.id !== 3)).toBe(true);
    expect(await getProductBySlug(db, "missing")).toBeUndefined();
    expect((await listPublishedSlugs(db))).toHaveLength(16);
  });
});

describe("catalog visibility", () => {
  let db: Db;
  let dispose: () => Promise<void>;
  beforeAll(async () => ({ db, dispose } = await createTestDb()));
  afterAll(async () => dispose?.());

  it("hides drafts and archived products everywhere", async () => {
    await db.update(products).set({ status: "draft" }).where(eq(products.id, 1));
    await db.update(products).set({ status: "archived" }).where(eq(products.id, 2));

    expect((await list(db)).total).toBe(14);
    expect(await getProductBySlug(db, "xerox-versalink-b415")).toBeUndefined();
    expect(await getPublishedProductById(db, 2)).toBeUndefined();
    const printers = (await listCategoriesWithCounts(db)).find(category => category.slug === "printers");
    expect(printers?.productCount).toBe(2);
  });

  it("hides products of inactive brands", async () => {
    await db.update(brands).set({ isActive: false }).where(eq(brands.slug, "canon"));
    expect((await list(db, { brand: "canon" })).total).toBe(0);
    expect((await listBrands(db)).map(brand => brand.slug)).not.toContain("canon");
    const paper = (await listCategoriesWithCounts(db)).find(category => category.slug === "paper");
    expect(paper?.productCount).toBe(3);
  });
});
