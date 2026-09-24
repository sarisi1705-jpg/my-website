import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/types";
import { createInquiry, getInquiry, markInquiryNotified } from "@/lib/server/inquiries";
import { inquiryFields } from "@/lib/validation/inquiry";
import { createTestDb } from "./setup";

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await createTestDb());
});
afterAll(async () => dispose?.());

const meta = { productSnapshot: null, sourcePath: "/contact", ipHash: "abc", userAgent: "vitest", now: 1_700_000_000_000 };

describe("inquiries repository", () => {
  it("stores a normalized inquiry with defaults", async () => {
    const fields = inquiryFields.parse({ type: "service", name: " سارة  يوسف ", phone: "٠٥٩٩-١١١-٢٢٢", message: "الطابعة لا تعمل" });
    const saved = await createInquiry(db, fields, meta);

    expect(saved.id).toBeGreaterThan(0);
    expect(saved).toMatchObject({
      type: "service", name: "سارة يوسف", phone: "0599111222", status: "new", preferredContact: "phone",
      internalNotes: "", notifiedAt: null, createdAt: meta.now, updatedAt: meta.now, sourcePath: "/contact",
    });
    expect(await getInquiry(db, saved.id)).toEqual(saved);
  });

  it("keeps the product id only when the product resolved to a snapshot", async () => {
    const fields = inquiryFields.parse({ type: "quote", name: "خالد", phone: "0599123456", productId: 3, quantity: 2 });
    const withProduct = await createInquiry(db, fields, { ...meta, productSnapshot: "طابعة (HP 4103fdw)" });
    const unknownProduct = await createInquiry(db, fields, meta);

    expect(withProduct).toMatchObject({ productId: 3, productSnapshot: "طابعة (HP 4103fdw)", quantity: 2 });
    expect(unknownProduct).toMatchObject({ productId: null, productSnapshot: null });
  });

  it("marks an inquiry as notified", async () => {
    const saved = await createInquiry(db, inquiryFields.parse({ type: "quote", name: "ليلى", phone: "0599000000" }), meta);
    await markInquiryNotified(db, saved.id, 1_700_000_000_500);
    expect((await getInquiry(db, saved.id))?.notifiedAt).toBe(1_700_000_000_500);
  });

  it("returns undefined for a missing inquiry", async () => {
    expect(await getInquiry(db, 999_999)).toBeUndefined();
  });
});
