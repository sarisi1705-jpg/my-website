import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
// Relative imports: drizzle-kit loads this file without the "@/" path alias.
import { DEFAULT_CURRENCY, iconKeys, productStatuses } from "../lib/catalog-constants";
import { contactMethods, inquiryStatuses, inquiryTypes } from "../lib/inquiry-constants";

export type { IconKey, ProductStatus } from "../lib/catalog-constants";
export type { ContactMethod, InquiryStatus, InquiryType } from "../lib/inquiry-constants";

// Timestamps are integer milliseconds set in app code (Date.now()).

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type", { enum: inquiryTypes }).notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    company: text("company"),
    preferredContact: text("preferred_contact", { enum: contactMethods }).notNull().default("phone"),
    // Plain integers rather than foreign keys: adding an FK to an existing
    // SQLite table forces a table rebuild, which D1 handles poorly. The app
    // resolves these, and productSnapshot keeps the context if a product changes.
    productId: integer("product_id"),
    productSnapshot: text("product_snapshot"),
    quantity: integer("quantity"),
    message: text("message").notNull().default(""),
    sourcePath: text("source_path"),
    status: text("status", { enum: inquiryStatuses }).notNull().default("new"),
    assignedTo: integer("assigned_to"),
    internalNotes: text("internal_notes").notNull().default(""),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    notifiedAt: integer("notified_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  table => [
    index("inquiries_status_created_idx").on(table.status, table.createdAt),
    index("inquiries_created_idx").on(table.createdAt),
  ],
);

export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;

// ── Catalog ────────────────────────────────────────────────────────────────
// No ON DELETE CASCADE: a category or brand that still has products cannot be
// deleted (the app returns 409), so products are never removed by accident.

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    iconKey: text("icon_key", { enum: iconKeys }).notNull().default("package"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  table => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const brands = sqliteTable(
  "brands",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  table => [uniqueIndex("brands_slug_unique").on(table.slug)],
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    model: text("model").notNull().default(""),
    brandId: integer("brand_id").notNull().references(() => brands.id),
    categoryId: integer("category_id").notNull().references(() => categories.id),
    description: text("description").notNull().default(""),
    specs: text("specs", { mode: "json" }).$type<string[]>().notNull().default([]),
    color: text("color").notNull().default("#1258dc"),
    imageKey: text("image_key"),
    // Optional price in minor units (agorot for ILS). NULL shows "السعر عند الطلب".
    priceMinor: integer("price_minor"),
    currency: text("currency").notNull().default(DEFAULT_CURRENCY),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: productStatuses }).notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    // Normalized Arabic/Latin text for search; rebuilt on every save (lib/search/normalize.ts).
    searchText: text("search_text").notNull().default(""),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  table => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_status_idx").on(table.categoryId, table.status),
    index("products_brand_idx").on(table.brandId),
    index("products_featured_status_idx").on(table.featured, table.status),
    index("products_updated_idx").on(table.updatedAt),
  ],
);

export type Category = typeof categories.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
