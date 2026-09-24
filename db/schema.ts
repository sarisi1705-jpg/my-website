import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
// Relative import: drizzle-kit loads this file without the "@/" path alias.
import { contactMethods, inquiryStatuses, inquiryTypes } from "../lib/inquiry-constants";

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
