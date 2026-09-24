import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminUsers, auditLog } from "@/db/schema";
import type { Db } from "@/db/types";
import { getInquiryDetail } from "@/lib/server/admin/inquiries";
import { createTelegramLinkCode, findStaffByTelegram, TELEGRAM_LINK_TTL_MS } from "@/lib/server/admin/users";
import { createInquiry } from "@/lib/server/inquiries";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/server/telegram-bot";
import { inquiryFields } from "@/lib/validation/inquiry";
import { createTestDb } from "./setup";

type Call = { method: string; body: Record<string, unknown> };

let db: Db;
let dispose: () => Promise<void>;
let calls: Call[];
const NOW = 1_800_000_000_000;
const SITE = "https://ssps.example";

beforeEach(async () => {
  ({ db, dispose } = await createTestDb());
  calls = [];
});
afterEach(async () => dispose?.());

const ctx = () => ({ db, siteUrl: SITE, now: NOW, api: async (method: string, body: Record<string, unknown>) => { calls.push({ method, body }); return { ok: true }; } });
let updateId = 1;
const message = (fromId: number, text: string, chatType = "private"): TelegramUpdate =>
  ({ update_id: updateId++, message: { message_id: 10, chat: { id: chatType === "private" ? fromId : -100, type: chatType }, from: { id: fromId }, text } });
const press = (fromId: number, data: string): TelegramUpdate =>
  ({ update_id: updateId++, callback_query: { id: `cb${updateId}`, from: { id: fromId }, data, message: { message_id: 55, chat: { id: -100 } } } });
const lastText = () => String(calls.filter(call => call.method === "sendMessage").at(-1)?.body.text ?? "");
const lastAnswer = () => calls.filter(call => call.method === "answerCallbackQuery").at(-1)?.body;

async function addStaff(email: string, role: "owner" | "editor" | "sales", telegramUserId?: number) {
  const [user] = await db.insert(adminUsers).values({ email, name: email.split("@")[0], role, passwordHash: "x", telegramUserId, createdAt: NOW, updatedAt: NOW }).returning();
  return user;
}

async function addInquiry() {
  return createInquiry(db, inquiryFields.parse({ type: "quote", name: "خالد", phone: "0599123456" }), { productSnapshot: null, sourcePath: null, ipHash: null, userAgent: null, now: NOW });
}

describe("linking a Telegram account", () => {
  it("links with a valid code via /link or the /start deep link, once", async () => {
    const sales = await addStaff("sales@ssps.ps", "sales");
    const { code } = await createTelegramLinkCode(db, sales.id, NOW);

    await handleTelegramUpdate(ctx(), message(777, `/link ${code.toLowerCase()}`));
    expect(lastText()).toContain("تم ربط حسابك: sales");
    expect((await findStaffByTelegram(db, 777))?.id).toBe(sales.id);

    // The code is single-use.
    await handleTelegramUpdate(ctx(), message(888, `/start ${code}`));
    expect(lastText()).toContain("الرمز غير صحيح");
    expect(await findStaffByTelegram(db, 888)).toBeNull();

    const audit = await db.select().from(auditLog).where(eq(auditLog.action, "telegram.link")).all();
    expect(audit).toHaveLength(1);
  });

  it("rejects expired codes and codes of deactivated staff", async () => {
    const sales = await addStaff("sales@ssps.ps", "sales");
    const { code } = await createTelegramLinkCode(db, sales.id, NOW - TELEGRAM_LINK_TTL_MS - 1);
    await handleTelegramUpdate(ctx(), message(777, `/link ${code}`));
    expect(await findStaffByTelegram(db, 777)).toBeNull();

    const fresh = await createTelegramLinkCode(db, sales.id, NOW);
    await db.update(adminUsers).set({ isActive: false }).where(eq(adminUsers.id, sales.id));
    await handleTelegramUpdate(ctx(), message(777, `/link ${fresh.code}`));
    expect(await findStaffByTelegram(db, 777)).toBeNull();
  });

  it("moves a Telegram account that was linked to someone else", async () => {
    const first = await addStaff("a@ssps.ps", "sales", 777);
    const second = await addStaff("b@ssps.ps", "owner");
    const { code } = await createTelegramLinkCode(db, second.id, NOW);
    await handleTelegramUpdate(ctx(), message(777, `/link ${code}`));
    expect((await findStaffByTelegram(db, 777))?.id).toBe(second.id);
    expect((await db.select().from(adminUsers).where(eq(adminUsers.id, first.id)).get())?.telegramUserId).toBeNull();
  });

  it("tells strangers how to link and keeps quiet in groups", async () => {
    await handleTelegramUpdate(ctx(), message(999, "/new"));
    expect(lastText()).toContain("هذا البوت خاص بفريق SSPS");
    calls = [];
    await handleTelegramUpdate(ctx(), message(999, "مرحبا", "supergroup"));
    expect(calls).toHaveLength(0);
  });
});

describe("request buttons", () => {
  it("lets linked sales staff take a request, redraws the card and logs it", async () => {
    const sales = await addStaff("sara@ssps.ps", "sales", 777);
    const inquiry = await addInquiry();

    await handleTelegramUpdate(ctx(), press(777, `i:${inquiry.id}:take`));

    const saved = await getInquiryDetail(db, inquiry.id);
    expect(saved).toMatchObject({ status: "in_progress", assignedTo: sales.id });
    const edit = calls.find(call => call.method === "editMessageText")!;
    expect(edit.body).toMatchObject({ chat_id: -100, message_id: 55 });
    expect(String(edit.body.text)).toContain("الحالة: قيد المتابعة · المسؤول: sara");
    expect(lastAnswer()).toMatchObject({ text: "تم إسناد الطلب إليك" });
    const audit = await db.select().from(auditLog).where(eq(auditLog.action, "inquiry.update")).get();
    expect(audit).toMatchObject({ userId: sales.id, entityId: String(inquiry.id) });
    expect(audit?.details).toMatchObject({ via: "telegram", status: { from: "new", to: "in_progress" } });
  });

  it("marks quoted, closes with a reopen button, and reopens", async () => {
    await addStaff("sara@ssps.ps", "sales", 777);
    const inquiry = await addInquiry();

    await handleTelegramUpdate(ctx(), press(777, `i:${inquiry.id}:quoted`));
    expect((await getInquiryDetail(db, inquiry.id)).status).toBe("quoted");

    await handleTelegramUpdate(ctx(), press(777, `i:${inquiry.id}:closed`));
    const keyboard = (calls.filter(call => call.method === "editMessageText").at(-1)!.body.reply_markup as { inline_keyboard: { text: string; callback_data?: string }[][] }).inline_keyboard;
    expect(keyboard[0]).toEqual([{ text: "↩️ إعادة فتح", callback_data: `i:${inquiry.id}:reopen` }]);
    expect(keyboard.at(-1)?.[0]).toMatchObject({ url: `${SITE}/admin/inquiries/${inquiry.id}` });

    await handleTelegramUpdate(ctx(), press(777, `i:${inquiry.id}:reopen`));
    expect((await getInquiryDetail(db, inquiry.id)).status).toBe("in_progress");
  });

  it("refuses strangers, staff without the permission, and deactivated staff", async () => {
    await addStaff("editor@ssps.ps", "editor", 555);
    const gone = await addStaff("gone@ssps.ps", "sales", 666);
    await db.update(adminUsers).set({ isActive: false }).where(eq(adminUsers.id, gone.id));
    const inquiry = await addInquiry();

    await handleTelegramUpdate(ctx(), press(999, `i:${inquiry.id}:take`));
    expect(lastAnswer()).toMatchObject({ show_alert: true });
    expect(String(lastAnswer()?.text)).toContain("غير مرتبط");

    await handleTelegramUpdate(ctx(), press(555, `i:${inquiry.id}:closed`));
    expect(String(lastAnswer()?.text)).toContain("صلاحيتك لا تسمح");

    await handleTelegramUpdate(ctx(), press(666, `i:${inquiry.id}:spam`));
    expect(String(lastAnswer()?.text)).toContain("غير مرتبط");

    expect((await getInquiryDetail(db, inquiry.id)).status).toBe("new");
    expect(calls.some(call => call.method === "editMessageText")).toBe(false);
  });

  it("ignores forged button data and handles deleted requests", async () => {
    await addStaff("sara@ssps.ps", "sales", 777);
    await handleTelegramUpdate(ctx(), press(777, "i:1:drop_table"));
    expect(lastAnswer()).toMatchObject({ text: "زر غير معروف." });
    await handleTelegramUpdate(ctx(), press(777, "i:4242:take"));
    expect(String(lastAnswer()?.text)).toContain("لم يعد موجوداً");
  });
});

describe("commands", () => {
  it("/new lists open requests with buttons, /r shows one, /stats summarizes", async () => {
    await addStaff("owner@ssps.ps", "owner", 777);
    const first = await addInquiry();
    const second = await addInquiry();

    await handleTelegramUpdate(ctx(), message(777, "/new@ssps_bot"));
    expect(lastText()).toContain("الطلبات المفتوحة (أحدث 2)");
    const listing = calls.at(-1)!.body.reply_markup as { inline_keyboard: { callback_data: string }[][] };
    expect(listing.inline_keyboard.map(row => row[0].callback_data)).toEqual([`i:${second.id}:show`, `i:${first.id}:show`]);

    await handleTelegramUpdate(ctx(), message(777, `/r SSPS-${String(first.id).padStart(6, "0")}`));
    expect(lastText()).toContain(`SSPS-${String(first.id).padStart(6, "0")}`);
    await handleTelegramUpdate(ctx(), message(777, "/r ٩٩٩"));
    expect(lastText()).toContain("لا يوجد طلب برقم SSPS-000999");

    await handleTelegramUpdate(ctx(), message(777, "/stats"));
    expect(lastText()).toContain("جديدة: 2");
  });

  it("editors can link but get no request commands; /unlink disconnects", async () => {
    await addStaff("editor@ssps.ps", "editor", 555);
    await handleTelegramUpdate(ctx(), message(555, "/new"));
    expect(lastText()).toContain("صلاحيتك لا تشمل الطلبات");
    await handleTelegramUpdate(ctx(), message(555, "/unlink"));
    expect(await findStaffByTelegram(db, 555)).toBeNull();
  });
});
