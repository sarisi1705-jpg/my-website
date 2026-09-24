import { eq } from "drizzle-orm";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { adminUsers, inquiries, products, sessions } from "@/db/schema";
import type { Db } from "@/db/types";
import { hashPassword } from "@/lib/auth/password";
import {
  archiveProduct, createBrand, createCategory, createProduct, deleteBrand, deleteCategory, deleteProduct, updateBrand, updateProduct,
} from "@/lib/server/admin/catalog";
import { exportInquiriesCsv, getInquiryDetail, inquiryDashboardStats, listInquiries, updateInquiry } from "@/lib/server/admin/inquiries";
import { changeOwnPassword, createStaff, deleteStaff, resetStaffPassword, updateStaff } from "@/lib/server/admin/users";
import { authenticate, createSession, getSessionUser, LOCKOUT_MS, SESSION_IDLE_MS, SESSION_MAX_MS, type SessionUser } from "@/lib/server/auth";
import { listProducts } from "@/lib/server/catalog";
import { createInquiry } from "@/lib/server/inquiries";
import { HttpError } from "@/lib/server/http";
import { inquiryListQuery, productInput } from "@/lib/validation/admin";
import { inquiryFields } from "@/lib/validation/inquiry";
import { parseCatalogQuery } from "@/lib/validation/catalog";
import { createTestDb } from "./setup";

let db: Db;
let dispose: () => Promise<void>;
beforeEach(async () => ({ db, dispose } = await createTestDb()));
afterEach(async () => dispose?.());

const NOW = 1_800_000_000_000;
const meta = { ipHash: null, userAgent: "vitest" };

async function addUser(email: string, role: "owner" | "editor" | "sales", password = "a-long-password-1") {
  const [user] = await db.insert(adminUsers).values({ email, name: email.split("@")[0], role, passwordHash: await hashPassword(password), createdAt: NOW, updatedAt: NOW }).returning();
  return user;
}

async function sessionFor(userId: number): Promise<SessionUser> {
  const token = await createSession(db, userId, meta, NOW);
  return (await getSessionUser(db, token, NOW))!;
}

async function rejects(promise: Promise<unknown>, status: number, code?: string) {
  const error = await promise.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  if (code) expect((error as HttpError).code).toBe(code);
}

describe("login", () => {
  it("accepts the right password case-insensitively by email and records the login", async () => {
    const user = await addUser("owner@ssps.ps", "owner");
    const result = await authenticate(db, "  Owner@SSPS.ps ", "a-long-password-1", NOW);
    expect(result.ok).toBe(true);
    const saved = await db.select().from(adminUsers).where(eq(adminUsers.id, user.id)).get();
    expect(saved).toMatchObject({ lastLoginAt: NOW, failedLogins: 0 });
  });

  it("treats unknown emails, wrong passwords and deactivated accounts the same", async () => {
    await addUser("owner@ssps.ps", "owner");
    const inactive = await addUser("gone@ssps.ps", "sales");
    await db.update(adminUsers).set({ isActive: false }).where(eq(adminUsers.id, inactive.id));
    expect(await authenticate(db, "nobody@ssps.ps", "a-long-password-1", NOW)).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticate(db, "owner@ssps.ps", "wrong-password", NOW)).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticate(db, "gone@ssps.ps", "a-long-password-1", NOW)).toEqual({ ok: false, reason: "invalid" });
  });

  it("locks the account for 15 minutes after 5 wrong passwords, even for the right one", async () => {
    await addUser("owner@ssps.ps", "owner");
    for (let attempt = 1; attempt <= 4; attempt++) expect((await authenticate(db, "owner@ssps.ps", "nope", NOW)).ok).toBe(false);
    expect(await authenticate(db, "owner@ssps.ps", "nope", NOW)).toEqual({ ok: false, reason: "locked" });
    expect(await authenticate(db, "owner@ssps.ps", "a-long-password-1", NOW + 60_000)).toEqual({ ok: false, reason: "locked" });
    expect((await authenticate(db, "owner@ssps.ps", "a-long-password-1", NOW + LOCKOUT_MS + 1)).ok).toBe(true);
  });

  it("upgrades hashes with fewer iterations on login", async () => {
    const [user] = await db.insert(adminUsers).values({ email: "old@ssps.ps", name: "Old", role: "sales", passwordHash: await hashPassword("a-long-password-1", 1000), createdAt: NOW, updatedAt: NOW }).returning();
    expect((await authenticate(db, "old@ssps.ps", "a-long-password-1", NOW)).ok).toBe(true);
    const saved = await db.select().from(adminUsers).where(eq(adminUsers.id, user.id)).get();
    expect(saved?.passwordHash).toMatch(/^pbkdf2\$sha256\$100000\$/);
  });
});

describe("sessions", () => {
  it("stores only a hash of the token and resolves the user", async () => {
    const user = await addUser("owner@ssps.ps", "owner");
    const token = await createSession(db, user.id, meta, NOW);
    const stored = await db.select().from(sessions).get();
    expect(stored?.id).not.toBe(token);
    expect(stored?.id).toMatch(/^[0-9a-f]{64}$/);
    expect(await getSessionUser(db, token, NOW)).toMatchObject({ id: user.id, role: "owner", email: "owner@ssps.ps" });
    expect(await getSessionUser(db, "forged-token", NOW)).toBeNull();
  });

  it("expires after a week idle, renews while used, and caps at 30 days", async () => {
    const user = await addUser("owner@ssps.ps", "owner");
    const token = await createSession(db, user.id, meta, NOW);
    expect(await getSessionUser(db, token, NOW + SESSION_IDLE_MS + 1)).toBeNull();

    let now = NOW;
    while (now + 6 * 24 * 3600 * 1000 < NOW + SESSION_MAX_MS) {
      now += 6 * 24 * 3600 * 1000; // used every 6 days
      expect(await getSessionUser(db, token, now)).not.toBeNull();
    }
    expect(await getSessionUser(db, token, NOW + SESSION_MAX_MS + 1)).toBeNull();
  });

  it("ends when the account is deactivated", async () => {
    const user = await addUser("sales@ssps.ps", "sales");
    const token = await createSession(db, user.id, meta, NOW);
    await db.update(adminUsers).set({ isActive: false }).where(eq(adminUsers.id, user.id));
    expect(await getSessionUser(db, token, NOW)).toBeNull();
  });
});

describe("staff accounts", () => {
  it("creates staff with a one-time temporary password they must change", async () => {
    const { user, temporaryPassword } = await createStaff(db, { email: "New@SSPS.ps", name: "سارة", role: "sales" }, NOW);
    expect(user).toMatchObject({ email: "new@ssps.ps", role: "sales", mustChangePassword: true });
    expect(user).not.toHaveProperty("passwordHash");
    expect((await authenticate(db, "new@ssps.ps", temporaryPassword!, NOW)).ok).toBe(true);
    await rejects(createStaff(db, { email: "new@ssps.ps", name: "x y", role: "sales" }), 409, "email_taken");
  });

  it("protects the last active owner", async () => {
    const owner = await addUser("owner@ssps.ps", "owner");
    const other = await addUser("other@ssps.ps", "owner");
    const actor = await sessionFor(other.id);
    // Two owners: demoting one is fine.
    await updateStaff(db, actor, owner.id, { role: "editor" }, NOW);
    // Now "other" is the only owner and can't be removed by anyone.
    const helper = await addUser("helper@ssps.ps", "owner");
    await updateStaff(db, await sessionFor(helper.id), helper.id, { name: "Helper" });
    await rejects(updateStaff(db, actor, other.id, { isActive: false }), 409, "self_lockout");
    await db.update(adminUsers).set({ role: "sales" }).where(eq(adminUsers.id, helper.id));
    await rejects(updateStaff(db, await sessionFor(owner.id), other.id, { role: "sales" }), 409, "last_owner");
    await rejects(deleteStaff(db, await sessionFor(owner.id), other.id), 409, "last_owner");
  });

  it("prevents self-lockout and self-deletion", async () => {
    const owner = await addUser("owner@ssps.ps", "owner");
    await addUser("owner2@ssps.ps", "owner");
    const actor = await sessionFor(owner.id);
    await rejects(updateStaff(db, actor, owner.id, { role: "sales" }), 409, "self_lockout");
    await rejects(updateStaff(db, actor, owner.id, { isActive: false }), 409, "self_lockout");
    await rejects(deleteStaff(db, actor, owner.id), 409, "self_delete");
    expect((await updateStaff(db, actor, owner.id, { name: "المالك" })).name).toBe("المالك");
  });

  it("signs people out when they are deactivated, change role or get a password reset", async () => {
    const owner = await addUser("owner@ssps.ps", "owner");
    const sales = await addUser("sales@ssps.ps", "sales");
    const actor = await sessionFor(owner.id);
    const salesToken = await createSession(db, sales.id, meta, NOW);

    await updateStaff(db, actor, sales.id, { role: "editor" }, NOW);
    expect(await getSessionUser(db, salesToken, NOW)).toBeNull();

    const token2 = await createSession(db, sales.id, meta, NOW);
    const { temporaryPassword } = await resetStaffPassword(db, sales.id, undefined, NOW);
    expect(await getSessionUser(db, token2, NOW)).toBeNull();
    expect((await authenticate(db, "sales@ssps.ps", temporaryPassword!, NOW)).ok).toBe(true);
  });

  it("deleting staff unassigns their inquiries", async () => {
    const owner = await addUser("owner@ssps.ps", "owner");
    const sales = await addUser("sales@ssps.ps", "sales");
    const inquiry = await createInquiry(db, inquiryFields.parse({ type: "quote", name: "خالد", phone: "0599123456" }), { productSnapshot: null, sourcePath: null, ipHash: null, userAgent: null });
    await updateInquiry(db, inquiry.id, { assignedTo: sales.id });
    await deleteStaff(db, await sessionFor(owner.id), sales.id);
    expect((await getInquiryDetail(db, inquiry.id)).assignedTo).toBeNull();
  });

  it("changing your own password needs the current one and keeps only this session", async () => {
    const user = await addUser("sales@ssps.ps", "sales");
    await db.update(adminUsers).set({ mustChangePassword: true }).where(eq(adminUsers.id, user.id));
    const otherToken = await createSession(db, user.id, meta, NOW);
    const actor = await sessionFor(user.id);

    await rejects(changeOwnPassword(db, actor, "wrong", "a-brand-new-password"), 400, "wrong_password");
    await changeOwnPassword(db, actor, "a-long-password-1", "a-brand-new-password", NOW);
    expect(await getSessionUser(db, otherToken, NOW)).toBeNull();
    expect((await getSessionUser(db, "x", NOW))).toBeNull();
    const saved = await db.select().from(adminUsers).where(eq(adminUsers.id, user.id)).get();
    expect(saved?.mustChangePassword).toBe(false);
    expect((await authenticate(db, "sales@ssps.ps", "a-brand-new-password", NOW)).ok).toBe(true);
  });
});

describe("catalog admin", () => {
  const input = (overrides: Record<string, unknown> = {}) =>
    productInput.parse({ name: "حبر أزرق", model: "T7742", brandId: 2, categoryId: 2, specs: ["أزرق"], status: "published", price: "45", ...overrides });

  it("creates products with a unique automatic slug and searchable text", async () => {
    const first = await createProduct(db, input(), 1, NOW);
    const second = await createProduct(db, input(), 1, NOW);
    expect(first).toMatchObject({ slug: "epson-t7742", priceMinor: 4500, createdBy: 1 });
    expect(second.slug).toBe("epson-t7742-2");
    expect(first.searchText).toContain("epson");
    expect((await listProducts(db, parseCatalogQuery({ q: "ازرق" }))).items.map(item => item.slug)).toContain("epson-t7742");
  });

  it("rejects taken slugs and unknown brands or categories", async () => {
    await rejects(createProduct(db, input({ slug: "epson-l6290" }), 1), 409, "slug_taken");
    await rejects(createProduct(db, input({ brandId: 999 }), 1), 400, "validation_failed");
  });

  it("reports the replaced image on update", async () => {
    const product = await createProduct(db, input({ imageKey: "products/aaa.webp" }), 1, NOW);
    const { replacedImageKey } = await updateProduct(db, product.id, input({ imageKey: "products/bbb.webp" }), 1, NOW);
    expect(replacedImageKey).toBe("products/aaa.webp");
    expect((await updateProduct(db, product.id, input({ imageKey: "products/bbb.webp" }), 1)).replacedImageKey).toBeNull();
  });

  it("archiving hides a product from the public site; deleting removes it", async () => {
    await archiveProduct(db, 1, 1, NOW);
    expect((await listProducts(db, parseCatalogQuery({}))).total).toBe(15);
    await deleteProduct(db, 1);
    expect(await db.select().from(products).where(eq(products.id, 1)).get()).toBeUndefined();
  });

  it("renaming a brand updates search; brands and categories in use can't be deleted", async () => {
    await updateBrand(db, 2, { name: "إبسون", slug: undefined, sortOrder: 2, isActive: true }, NOW);
    expect((await listProducts(db, parseCatalogQuery({ q: "ابسون" }))).total).toBe(4);
    await rejects(deleteBrand(db, 2), 409, "in_use");
    await rejects(deleteCategory(db, 1), 409, "in_use");
    expect((await deleteCategory(db, 5)).slug).toBe("solutions");
  });

  it("needs a Latin slug for brands with Arabic-only names", async () => {
    await rejects(createBrand(db, { name: "الشرق", slug: undefined, sortOrder: 0, isActive: true }), 400, "validation_failed");
    expect((await createBrand(db, { name: "Brother", slug: undefined, sortOrder: 0, isActive: true })).slug).toBe("brother");
    await rejects(createCategory(db, { slug: "printers", name: "مكرر", description: "", iconKey: "package", sortOrder: 0, isActive: true }), 409, "slug_taken");
  });
});

describe("inquiry admin", () => {
  async function addInquiry(fields: Record<string, unknown>, createdAt = NOW) {
    return createInquiry(db, inquiryFields.parse({ type: "quote", ...fields }), { productSnapshot: null, sourcePath: null, ipHash: null, userAgent: null, now: createdAt });
  }

  it("filters by status, type, reference number, phone, name and date", async () => {
    const owner = await addUser("owner@ssps.ps", "owner");
    const a = await addInquiry({ name: "خالد منصور", phone: "0599123456" }, NOW);
    await addInquiry({ name: "سارة يوسف", phone: "0568000111", type: "service", message: "صيانة طابعة" }, NOW - 3 * 24 * 3600 * 1000);
    await updateInquiry(db, a.id, { status: "quoted" });
    const list = async (params: Record<string, string>) => (await listInquiries(db, inquiryListQuery.parse(params), owner.id)).items.map(item => item.name);

    expect(await list({})).toHaveLength(2);
    expect(await list({ status: "quoted" })).toEqual(["خالد منصور"]);
    expect(await list({ type: "service" })).toEqual(["سارة يوسف"]);
    expect(await list({ q: `SSPS-${String(a.id).padStart(6, "0")}` })).toEqual(["خالد منصور"]);
    expect(await list({ q: "٠٥٦٨" })).toEqual(["سارة يوسف"]);
    expect(await list({ q: "سارة" })).toEqual(["سارة يوسف"]);
    const today = new Date(NOW).toISOString().slice(0, 10);
    expect(await list({ from: today })).toEqual(["خالد منصور"]);
  });

  it("only assigns inquiries to active staff who handle them", async () => {
    const editor = await addUser("editor@ssps.ps", "editor");
    const sales = await addUser("sales@ssps.ps", "sales");
    const inquiry = await addInquiry({ name: "خالد", phone: "0599123456" });
    await rejects(updateInquiry(db, inquiry.id, { assignedTo: editor.id }), 400);
    const { after } = await updateInquiry(db, inquiry.id, { assignedTo: sales.id, status: "in_progress", internalNotes: "اتصلت به" });
    expect(after).toMatchObject({ assigneeName: "sales", status: "in_progress", internalNotes: "اتصلت به" });
    await rejects(updateInquiry(db, 99_999, { status: "closed" }), 404);
  });

  it("exports CSV that Excel reads correctly and can't be turned into formulas", async () => {
    const owner = await addUser("owner@ssps.ps", "owner");
    await addInquiry({ name: "=HYPERLINK(\"http://evil\")", phone: "0599123456", message: "سطر أول\nسطر, ثاني" });
    const csv = await exportInquiriesCsv(db, inquiryListQuery.parse({}), owner.id);
    expect(csv.startsWith("﻿رقم الطلب,")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(`"سطر أول\nسطر, ثاني"`);
  });

  it("summarizes inquiries for the dashboard", async () => {
    await addInquiry({ name: "خالد", phone: "0599123456" }, Date.now());
    const stats = await inquiryDashboardStats(db);
    expect(stats.byStatus.new).toBe(1);
    expect(stats.lastDay).toBe(1);
    expect(stats.notNotified).toBe(1);
    expect(stats.recent[0].name).toBe("خالد");
    await db.update(inquiries).set({ notifiedAt: 1 });
    expect((await inquiryDashboardStats(db)).notNotified).toBe(0);
  });
});
