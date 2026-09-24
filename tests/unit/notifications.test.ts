import { describe, expect, it, vi } from "vitest";
import type { Inquiry } from "@/db/schema";
import { formatInquiryAlert, sendTelegramMessage } from "@/lib/server/telegram";
import { verifyTurnstile } from "@/lib/server/turnstile";

const inquiry: Inquiry = {
  id: 12, type: "quote", name: "خالد منصور", phone: "0599123456", email: null, company: "مكتب النور",
  preferredContact: "whatsapp", productId: 3, productSnapshot: "طابعة ليزر (HP LaserJet Pro 4103fdw)", quantity: 2,
  message: "نحتاج توصيل", sourcePath: "/contact", status: "new", assignedTo: null, internalNotes: "",
  ipHash: null, userAgent: null, notifiedAt: null, createdAt: 0, updatedAt: 0,
};

function fakeFetch(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe("formatInquiryAlert", () => {
  it("includes the reference, contact details, product and admin link", () => {
    const text = formatInquiryAlert(inquiry, "https://example.com/");
    expect(text).toContain("طلب عرض سعر جديد — SSPS-000012");
    expect(text).toContain("الهاتف: 0599123456");
    expect(text).toContain("طريقة التواصل المفضلة: واتساب");
    expect(text).toContain("الشركة: مكتب النور");
    expect(text).toContain("المنتج: طابعة ليزر (HP LaserJet Pro 4103fdw) × 2");
    expect(text).toContain("https://example.com/admin/inquiries/12");
    expect(text).not.toContain("البريد:");
  });

  it("stays within Telegram's 4096-character limit", () => {
    expect(formatInquiryAlert({ ...inquiry, message: "x".repeat(5000) }, "https://e.com").length).toBeLessThanOrEqual(4096);
  });
});

describe("sendTelegramMessage", () => {
  it("skips sending when not configured", async () => {
    const fetchImpl = fakeFetch({ ok: true });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await sendTelegramMessage({ token: "", chatId: "1" }, "hi", fetchImpl)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts plain text to the Bot API", async () => {
    const fetchImpl = fakeFetch({ ok: true });
    expect(await sendTelegramMessage({ token: "T", chatId: "42" }, "مرحبا", fetchImpl)).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/botT/sendMessage");
    expect(JSON.parse(String(init?.body))).toEqual({ chat_id: "42", text: "مرحبا", disable_web_page_preview: true });
  });

  it("returns false instead of throwing on HTTP or network errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendTelegramMessage({ token: "T", chatId: "42" }, "x", fakeFetch({}, 401))).toBe(false);
    const failing = vi.fn(async () => { throw new Error("offline"); });
    expect(await sendTelegramMessage({ token: "T", chatId: "42" }, "x", failing)).toBe(false);
  });
});

describe("verifyTurnstile", () => {
  it("fails closed without a secret or token", async () => {
    const fetchImpl = fakeFetch({ success: true });
    expect(await verifyTurnstile({ secret: undefined, token: "t" }, fetchImpl)).toEqual({ ok: false, reason: "turnstile-secret-missing" });
    expect(await verifyTurnstile({ secret: "s", token: "" }, fetchImpl)).toEqual({ ok: false, reason: "turnstile-token-missing" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts a successful verification and sends the visitor IP", async () => {
    const fetchImpl = fakeFetch({ success: true });
    expect(await verifyTurnstile({ secret: "s", token: "t", ip: "1.2.3.4" }, fetchImpl)).toEqual({ ok: true });
    const body = fetchImpl.mock.calls[0][1]?.body as FormData;
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("rejects failed verifications and network errors", async () => {
    expect(await verifyTurnstile({ secret: "s", token: "t" }, fakeFetch({ success: false, "error-codes": ["timeout-or-duplicate"] })))
      .toEqual({ ok: false, reason: "timeout-or-duplicate" });
    const failing = vi.fn(async () => { throw new Error("offline"); });
    expect((await verifyTurnstile({ secret: "s", token: "t" }, failing)).ok).toBe(false);
  });
});
