import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const WEBHOOK_SECRET = "e2e-webhook-secret"; // matches tests/e2e/e2e.vars
const ORIGIN = { origin: "http://127.0.0.1:8787" };
type Call = { method: string; body: Record<string, unknown> };

test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

function ownerCookie(): Record<string, string> {
  const state = JSON.parse(readFileSync("playwright/.auth/owner.json", "utf8")) as { cookies: { name: string; value: string }[] };
  return { cookie: state.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ") };
}

async function calls(): Promise<Call[]> {
  return (await (await fetch("http://127.0.0.1:8799/calls")).json()) as Call[];
}

test("staff link Telegram and handle a request from its buttons", async ({ request }) => {
  const webhook = (update: object, secret = WEBHOOK_SECRET) =>
    request.post("/api/telegram/webhook", { data: update, headers: { "x-telegram-bot-api-secret-token": secret } });

  // Only Telegram (which knows the secret) may call the bot endpoint.
  expect((await webhook({ update_id: 1 }, "wrong")).status()).toBe(401);

  // The owner gets a one-time code with a one-tap link to the bot.
  const codeResponse = await request.post("/api/admin/auth/telegram", { headers: { ...ownerCookie(), ...ORIGIN } });
  expect(codeResponse.status()).toBe(200);
  const { code, botUsername } = (await codeResponse.json()).data as { code: string; botUsername: string };
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  expect(botUsername).toBe("ssps_test_bot");

  // Tapping the link sends "/start CODE" from the owner's Telegram account.
  await webhook({ update_id: 2, message: { message_id: 1, chat: { id: 4242, type: "private" }, from: { id: 4242 }, text: `/start ${code}` } });
  await expect.poll(async () => (await calls()).some(call => call.method === "sendMessage" && String(call.body.text).includes("تم ربط حسابك"))).toBe(true);

  // Pressing "I'll take it" under request #1 updates the website.
  await webhook({ update_id: 3, callback_query: { id: "cb1", from: { id: 4242 }, data: "i:1:take", message: { message_id: 9, chat: { id: 1000 } } } });
  const inquiry = await request.get("/api/admin/inquiries/1", { headers: ownerCookie() });
  expect((await inquiry.json()).data).toMatchObject({ status: "in_progress", assigneeName: "مالك الاختبار" });

  const recorded = await calls();
  const edit = recorded.find(call => call.method === "editMessageText");
  expect(edit?.body).toMatchObject({ chat_id: 1000, message_id: 9 });
  expect(String(edit?.body.text)).toContain("المسؤول: مالك الاختبار");
  expect(recorded.find(call => call.method === "answerCallbackQuery")?.body).toMatchObject({ text: "تم إسناد الطلب إليك" });
});

test("owners connect the bot from the admin panel", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "playwright/.auth/owner.json", locale: "ar" });
  const page = await context.newPage();
  await page.goto("/admin/telegram");
  await expect(page.getByText("البوت: @ssps_test_bot")).toBeVisible();
  await page.getByRole("button", { name: "ربط البوت بالموقع" }).click();
  await expect.poll(async () => (await calls()).find(call => call.method === "setWebhook")?.body).toMatchObject({
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
  });
  expect((await calls()).some(call => call.method === "setMyCommands")).toBe(true);

  await page.getByRole("button", { name: "إرسال رسالة تجريبية" }).click();
  await expect.poll(async () => (await calls()).some(call => call.method === "sendMessage" && String(call.body.text).includes("رسالة تجريبية"))).toBe(true);
});
