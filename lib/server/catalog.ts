import { and, asc, count, desc, eq, ne, sql, type SQL } from "drizzle-orm";
import { brands, categories, products } from "@/db/schema";
import type { Db } from "@/db/types";
import type { IconKey } from "@/lib/catalog-constants";
import { escapeLike, normalizeArabic, searchTerms } from "@/lib/search/normalize";
import type { CatalogQuery } from "@/lib/validation/catalog";

/** A published product as the public site shows it. */
export type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  model: string;
  description: string;
  specs: string[];
  color: string;
  imageKey: string | null;
  priceMinor: number | null;
  currency: string;
  featured: boolean;
  brand: { slug: string; name: string };
  category: { slug: string; name: string; iconKey: IconKey };
};

export type CategoryWithCount = {
  id: number;
  slug: string;
  name: string;
  description: string;
  iconKey: IconKey;
  productCount: number;
};

export type ProductPage = { items: CatalogProduct[]; total: number; page: number; pageSize: number; pageCount: number };

// Old links used the product-type names from the static catalog (e.g. ?category=طابعات).
const LEGACY_CATEGORY_NAMES: Record<string, string> = {
  "طابعات": "printers",
  "أحبار وتونر": "toners",
  "قطع وصيانة": "parts",
  "ورق وطباعة": "paper",
};

const productColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  model: products.model,
  description: products.description,
  specs: products.specs,
  color: products.color,
  imageKey: products.imageKey,
  priceMinor: products.priceMinor,
  currency: products.currency,
  featured: products.featured,
  brandSlug: brands.slug,
  brandName: brands.name,
  categorySlug: categories.slug,
  categoryName: categories.name,
  categoryIconKey: categories.iconKey,
};

type ProductRow = NonNullable<Awaited<ReturnType<ReturnType<typeof publicProducts>["get"]>>>;

function toCatalogProduct(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    model: row.model,
    description: row.description,
    specs: row.specs,
    color: row.color,
    imageKey: row.imageKey,
    priceMinor: row.priceMinor,
    currency: row.currency,
    featured: row.featured,
    brand: { slug: row.brandSlug, name: row.brandName },
    category: { slug: row.categorySlug, name: row.categoryName, iconKey: row.categoryIconKey },
  };
}

/** Visible to the public: published, in an active category and brand. */
const publiclyVisible = and(eq(products.status, "published"), eq(categories.isActive, true), eq(brands.isActive, true))!;

function publicProducts(db: Db) {
  return db
    .select(productColumns)
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .innerJoin(categories, eq(products.categoryId, categories.id));
}

export async function listCategoriesWithCounts(db: Db): Promise<CategoryWithCount[]> {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      iconKey: categories.iconKey,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(
      products,
      and(eq(products.categoryId, categories.id), eq(products.status, "published"),
        sql`exists (select 1 from ${brands} where ${brands.id} = ${products.brandId} and ${brands.isActive} = 1)`),
    )
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.id));
}

export async function listBrands(db: Db): Promise<{ id: number; slug: string; name: string }[]> {
  return db
    .select({ id: brands.id, slug: brands.slug, name: brands.name })
    .from(brands)
    .where(eq(brands.isActive, true))
    .orderBy(asc(brands.sortOrder), asc(brands.name));
}

/** Accepts a category slug, its display name, or a legacy name; returns the slug or undefined. */
export async function resolveCategoryParam(db: Db, value: string | undefined): Promise<string | undefined> {
  if (!value) return undefined;
  const legacy = LEGACY_CATEGORY_NAMES[value];
  if (legacy) return legacy;
  const active = await db.select({ slug: categories.slug, name: categories.name }).from(categories).where(eq(categories.isActive, true));
  const wanted = normalizeArabic(value);
  return active.find(category => category.slug === value.toLowerCase() || normalizeArabic(category.name) === wanted)?.slug;
}

export async function listProducts(db: Db, query: CatalogQuery): Promise<ProductPage> {
  const conditions: SQL[] = [publiclyVisible];
  if (query.category) conditions.push(eq(categories.slug, query.category));
  if (query.brand) conditions.push(eq(brands.slug, query.brand));
  if (query.featured) conditions.push(eq(products.featured, true));
  for (const term of searchTerms(query.q ?? "")) {
    conditions.push(sql`${products.searchText} like ${`%${escapeLike(term)}%`} escape '\\'`);
  }
  const where = and(...conditions);

  const order =
    query.sort === "newest" ? [desc(products.createdAt), desc(products.id)]
      : query.sort === "name" ? [asc(products.name), asc(products.id)]
        : [desc(products.featured), asc(products.sortOrder), asc(products.id)];

  const offset = (query.page - 1) * query.pageSize;
  // Two queries in parallel rather than db.batch(): D1 batch results come back
  // keyed by column name, so the joined tables' slug/name columns overwrite each other.
  const [rows, [{ total }]] = await Promise.all([
    publicProducts(db).where(where).orderBy(...order).limit(query.pageSize).offset(offset),
    db
      .select({ total: count() })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where),
  ]);

  return {
    items: rows.map(toCatalogProduct),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getProductBySlug(db: Db, slug: string): Promise<CatalogProduct | undefined> {
  const row = await publicProducts(db).where(and(publiclyVisible, eq(products.slug, slug))).get();
  return row && toCatalogProduct(row);
}

export async function getPublishedProductById(db: Db, id: number): Promise<CatalogProduct | undefined> {
  const row = await publicProducts(db).where(and(publiclyVisible, eq(products.id, id))).get();
  return row && toCatalogProduct(row);
}

export async function getRelatedProducts(db: Db, product: CatalogProduct, limit = 4): Promise<CatalogProduct[]> {
  const rows = await publicProducts(db)
    .where(and(publiclyVisible, eq(categories.slug, product.category.slug), ne(products.id, product.id)))
    .orderBy(desc(products.featured), asc(products.sortOrder), asc(products.id))
    .limit(limit);
  return rows.map(toCatalogProduct);
}

/** Slugs for the sitemap. */
export async function listPublishedSlugs(db: Db): Promise<{ slug: string; updatedAt: number }[]> {
  return db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(publiclyVisible)
    .orderBy(asc(products.id));
}
