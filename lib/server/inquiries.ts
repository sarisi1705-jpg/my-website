import { eq } from "drizzle-orm";
import type { Db } from "@/db/types";
import { inquiries, type Inquiry } from "@/db/schema";
import type { InquiryFields } from "@/lib/validation/inquiry";

export type InquiryMeta = {
  productSnapshot: string | null;
  sourcePath: string | null;
  ipHash: string | null;
  userAgent: string | null;
  now?: number;
};

export async function createInquiry(db: Db, fields: InquiryFields, meta: InquiryMeta): Promise<Inquiry> {
  const now = meta.now ?? Date.now();
  const [row] = await db
    .insert(inquiries)
    .values({
      type: fields.type,
      name: fields.name,
      phone: fields.phone,
      email: fields.email ?? null,
      company: fields.company ?? null,
      preferredContact: fields.preferredContact,
      // Only keep the product id when it resolved to a real product.
      productId: meta.productSnapshot ? (fields.productId ?? null) : null,
      productSnapshot: meta.productSnapshot,
      quantity: fields.quantity ?? null,
      message: fields.message,
      sourcePath: meta.sourcePath,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return row;
}

export async function markInquiryNotified(db: Db, id: number, now = Date.now()): Promise<void> {
  await db.update(inquiries).set({ notifiedAt: now }).where(eq(inquiries.id, id));
}

export async function getInquiry(db: Db, id: number): Promise<Inquiry | undefined> {
  return db.select().from(inquiries).where(eq(inquiries.id, id)).get();
}
