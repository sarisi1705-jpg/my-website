import { and, asc, count, desc, eq, ne, sql, type SQL } from "drizzle-orm";
import { brands, categories, products, type Brand, type Category, type Product } from "@/db/schema";
import type { Db } from "@/db/types";
import { buildSearchText, escapeLike, searchTerms } from "@/lib/search/normalize";
import { slugify } from "@/lib/slug";
import { HttpError } from "@/lib/server/http";
import type { AdminProductListQuery, BrandInput, CategoryInput, ProductInput } from "@/lib/validation/admin";

export const ADMIN_PAGE_SIZE = 25;

export type AdminProductRow = Pick<Product, "id" | "slug" | "name" | "model" | "status" | "featured" | "priceMinor" | "currency" | "imageKey" | "updatedAt"> & {
  brandName: string;
  categoryName: string;
};

// ── Products ───────────────────────────────────────────────────────────────

export async function adminListProducts(db: Db, query: AdminProductListQuery) {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(products.status, query.status));
  if (query.category) conditions.push(eq(categories.slug, query.category));
  for (const term of searchTerms(query.q ?? "")) conditions.push(sql`${products.searchText} like ${`%${escapeLike(term)}%`} escape '\\'`);
  if (query.q && /^[a-z0-9-]+$/i.test(query.q)) {
    // Also match slugs typed exactly.
    const last = conditions.pop()!;
    conditions.push(sql`(${last} or ${products.slug} = ${query.q.toLowerCase()})`);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: products.id, slug: products.slug, name: products.name, model: products.model, status: products.status,
        featured: products.featured, priceMinor: products.priceMinor, currency: products.currency, imageKey: products.imageKey,
        updatedAt: products.updatedAt, brandName: brands.name, categoryName: categories.name,
      })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(desc(products.updatedAt), desc(products.id))
      .limit(ADMIN_PAGE_SIZE)
      .offset((query.page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: count() }).from(products).innerJoin(brands, eq(products.brandId, brands.id)).innerJoin(categories, eq(products.categoryId, categories.id)).where(where),
  ]);
  return { items: rows as AdminProductRow[], total, page: query.page, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export async function getAdminProduct(db: Db, id: number): Promise<Product> {
  const product = await db.select().from(products).where(eq(products.id, id)).get();
  if (!product) throw new HttpError(404, "not_found", "المنتج غير موجود.");
  return product;
}

async function loadBrandAndCategory(db: Db, brandId: number, categoryId: number): Promise<{ brand: Brand; category: Category }> {
  const [brand, category] = await Promise.all([
    db.select().from(brands).where(eq(brands.id, brandId)).get(),
    db.select().from(categories).where(eq(categories.id, categoryId)).get(),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!brand) fieldErrors.brandId = "العلامة التجارية غير موجودة";
  if (!category) fieldErrors.categoryId = "التصنيف غير موجود";
  if (!brand || !category) throw new HttpError(400, "validation_failed", "يرجى مراجعة الحقول.", fieldErrors);
  return { brand, category };
}

/** An explicit slug must be free; an automatic one gets -2, -3… until it is. */
async function resolveProductSlug(db: Db, input: ProductInput, brand: Brand, excludeId?: number): Promise<string> {
  const taken = async (candidate: string) =>
    Boolean(await db.select({ id: products.id }).from(products).where(excludeId ? and(eq(products.slug, candidate), ne(products.id, excludeId)) : eq(products.slug, candidate)).get());

  if (input.slug) {
    if (await taken(input.slug)) throw new HttpError(409, "slug_taken", "هذا الرابط مستخدم لمنتج آخر.", { slug: "هذا الرابط مستخدم لمنتج آخر" });
    return input.slug;
  }
  const base = slugify(`${brand.slug} ${input.model}`) || slugify(`${brand.slug} ${input.name}`) || `${brand.slug}-product`;
  for (let suffix = 1; ; suffix++) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!(await taken(candidate))) return candidate;
  }
}

function productValues(input: ProductInput, brand: Brand, category: Category) {
  return {
    name: input.name,
    model: input.model,
    brandId: brand.id,
    categoryId: category.id,
    description: input.description,
    specs: input.specs,
    color: input.color,
    imageKey: input.imageKey,
    priceMinor: input.price,
    featured: input.featured,
    status: input.status,
    sortOrder: input.sortOrder,
    searchText: buildSearchText({ name: input.name, model: input.model, brand: brand.name, category: category.name, specs: input.specs, description: input.description }),
  };
}

export async function createProduct(db: Db, input: ProductInput, actorId: number, now = Date.now()): Promise<Product> {
  const { brand, category } = await loadBrandAndCategory(db, input.brandId, input.categoryId);
  const slug = await resolveProductSlug(db, input, brand);
  const [row] = await db
    .insert(products)
    .values({ ...productValues(input, brand, category), slug, createdBy: actorId, updatedBy: actorId, createdAt: now, updatedAt: now })
    .returning();
  return row;
}

/** Returns the saved product and the image it replaced (for cleanup in R2). */
export async function updateProduct(db: Db, id: number, input: ProductInput, actorId: number, now = Date.now()): Promise<{ product: Product; replacedImageKey: string | null }> {
  const existing = await getAdminProduct(db, id);
  const { brand, category } = await loadBrandAndCategory(db, input.brandId, input.categoryId);
  const slug = input.slug ? await resolveProductSlug(db, input, brand, id) : existing.slug;
  const [row] = await db
    .update(products)
    .set({ ...productValues(input, brand, category), slug, updatedBy: actorId, updatedAt: now })
    .where(eq(products.id, id))
    .returning();
  return { product: row, replacedImageKey: existing.imageKey && existing.imageKey !== row.imageKey ? existing.imageKey : null };
}

export async function archiveProduct(db: Db, id: number, actorId: number, now = Date.now()): Promise<Product> {
  await getAdminProduct(db, id);
  const [row] = await db.update(products).set({ status: "archived", updatedBy: actorId, updatedAt: now }).where(eq(products.id, id)).returning();
  return row;
}

/** Permanent delete. Inquiries keep their product snapshot text. Returns the image to remove. */
export async function deleteProduct(db: Db, id: number): Promise<Product> {
  const existing = await getAdminProduct(db, id);
  await db.delete(products).where(eq(products.id, id));
  return existing;
}

/** Rebuilds search_text for products after a brand or category rename. */
async function rebuildSearchText(db: Db, where: SQL): Promise<void> {
  const rows = await db
    .select({ id: products.id, name: products.name, model: products.model, specs: products.specs, description: products.description, brandName: brands.name, categoryName: categories.name })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where);
  const updates = rows.map(row =>
    db.update(products).set({ searchText: buildSearchText({ name: row.name, model: row.model, brand: row.brandName, category: row.categoryName, specs: row.specs, description: row.description }) }).where(eq(products.id, row.id)),
  );
  // D1 batches are atomic; keep each one modest.
  for (let start = 0; start < updates.length; start += 50) {
    const chunk = updates.slice(start, start + 50);
    if (chunk.length) await db.batch(chunk as [typeof chunk[number], ...typeof chunk]);
  }
}

// ── Categories ─────────────────────────────────────────────────────────────

export type AdminCategory = Category & { productCount: number };

export async function adminListCategories(db: Db): Promise<AdminCategory[]> {
  return db
    .select({
      id: categories.id, slug: categories.slug, name: categories.name, description: categories.description, iconKey: categories.iconKey,
      sortOrder: categories.sortOrder, isActive: categories.isActive, createdAt: categories.createdAt, updatedAt: categories.updatedAt,
      productCount: sql<number>`(select count(*) from ${products} where ${products.categoryId} = ${categories.id})`.mapWith(Number),
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));
}

async function assertSlugFree(db: Db, table: typeof categories | typeof brands, slug: string, excludeId?: number) {
  const existing = await db.select({ id: table.id }).from(table).where(excludeId ? and(eq(table.slug, slug), ne(table.id, excludeId)) : eq(table.slug, slug)).get();
  if (existing) throw new HttpError(409, "slug_taken", "هذا الرابط مستخدم.", { slug: "هذا الرابط مستخدم" });
}

export async function createCategory(db: Db, input: CategoryInput, now = Date.now()): Promise<Category> {
  await assertSlugFree(db, categories, input.slug);
  const [row] = await db.insert(categories).values({ ...input, createdAt: now, updatedAt: now }).returning();
  return row;
}

export async function updateCategory(db: Db, id: number, input: CategoryInput, now = Date.now()): Promise<Category> {
  const existing = await db.select().from(categories).where(eq(categories.id, id)).get();
  if (!existing) throw new HttpError(404, "not_found", "التصنيف غير موجود.");
  await assertSlugFree(db, categories, input.slug, id);
  const [row] = await db.update(categories).set({ ...input, updatedAt: now }).where(eq(categories.id, id)).returning();
  if (existing.name !== row.name) await rebuildSearchText(db, eq(products.categoryId, id));
  return row;
}

export async function deleteCategory(db: Db, id: number): Promise<Category> {
  const existing = await db.select().from(categories).where(eq(categories.id, id)).get();
  if (!existing) throw new HttpError(404, "not_found", "التصنيف غير موجود.");
  const [{ total }] = await db.select({ total: count() }).from(products).where(eq(products.categoryId, id));
  if (total > 0) throw new HttpError(409, "in_use", `لا يمكن حذف التصنيف لأنه يحتوي على ${total} منتج. انقل المنتجات أو عطّل التصنيف بدلاً من ذلك.`);
  await db.delete(categories).where(eq(categories.id, id));
  return existing;
}

// ── Brands ─────────────────────────────────────────────────────────────────

export type AdminBrand = Brand & { productCount: number };

export async function adminListBrands(db: Db): Promise<AdminBrand[]> {
  return db
    .select({
      id: brands.id, slug: brands.slug, name: brands.name, sortOrder: brands.sortOrder, isActive: brands.isActive,
      createdAt: brands.createdAt, updatedAt: brands.updatedAt,
      productCount: sql<number>`(select count(*) from ${products} where ${products.brandId} = ${brands.id})`.mapWith(Number),
    })
    .from(brands)
    .orderBy(asc(brands.sortOrder), asc(brands.name));
}

function brandSlug(input: BrandInput): string {
  const slug = input.slug ?? slugify(input.name);
  if (!slug) throw new HttpError(400, "validation_failed", "يرجى مراجعة الحقول.", { slug: "أدخل رابطاً بالأحرف الإنجليزية (مثال: hp)" });
  return slug;
}

export async function createBrand(db: Db, input: BrandInput, now = Date.now()): Promise<Brand> {
  const slug = brandSlug(input);
  await assertSlugFree(db, brands, slug);
  const [row] = await db.insert(brands).values({ name: input.name, slug, sortOrder: input.sortOrder, isActive: input.isActive, createdAt: now, updatedAt: now }).returning();
  return row;
}

export async function updateBrand(db: Db, id: number, input: BrandInput, now = Date.now()): Promise<Brand> {
  const existing = await db.select().from(brands).where(eq(brands.id, id)).get();
  if (!existing) throw new HttpError(404, "not_found", "العلامة التجارية غير موجودة.");
  const slug = input.slug ?? existing.slug;
  await assertSlugFree(db, brands, slug, id);
  const [row] = await db.update(brands).set({ name: input.name, slug, sortOrder: input.sortOrder, isActive: input.isActive, updatedAt: now }).where(eq(brands.id, id)).returning();
  if (existing.name !== row.name) await rebuildSearchText(db, eq(products.brandId, id));
  return row;
}

export async function deleteBrand(db: Db, id: number): Promise<Brand> {
  const existing = await db.select().from(brands).where(eq(brands.id, id)).get();
  if (!existing) throw new HttpError(404, "not_found", "العلامة التجارية غير موجودة.");
  const [{ total }] = await db.select({ total: count() }).from(products).where(eq(products.brandId, id));
  if (total > 0) throw new HttpError(409, "in_use", `لا يمكن حذف العلامة لأنها مرتبطة بـ ${total} منتج. عطّلها بدلاً من ذلك.`);
  await db.delete(brands).where(eq(brands.id, id));
  return existing;
}

/** Counts per status for the dashboard. */
export async function productStatusCounts(db: Db): Promise<Record<string, number>> {
  const rows = await db.select({ status: products.status, total: count() }).from(products).groupBy(products.status);
  return Object.fromEntries(rows.map(row => [row.status, row.total]));
}
