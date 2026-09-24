import type { Inquiry } from "@/db/schema";
import { inquiryStatusLabels } from "@/lib/inquiry-constants";
import { contactMethodLabels, formatInquiryReference, inquiryTypeLabels } from "@/lib/validation/inquiry";

const TELEGRAM_MESSAGE_LIMIT = 4096;

export type TelegramConfig = {
  token: string | undefined;
  chatId: string | undefined;
  // Overridable for local testing; defaults to the real Bot API.
  apiBase?: string;
};

export type TelegramResult<T = unknown> = { ok: boolean; result?: T; description?: string };

/** Calls a Bot API method. Never throws: failures come back as { ok: false }. */
export async function callTelegram<T = unknown>(
  { token, apiBase = "https://api.telegram.org" }: Pick<TelegramConfig, "token" | "apiBase">,
  method: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<TelegramResult<T>> {
  if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN is not set" };
  try {
    const response = await fetchImpl(`${apiBase}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as TelegramResult<T>;
    if (!response.ok || !payload.ok) {
      console.error(`[telegram] ${method} failed with HTTP ${response.status}: ${payload.description ?? ""}`);
      return { ok: false, description: payload.description ?? `HTTP ${response.status}` };
    }
    return payload;
  } catch (error) {
    console.error(`[telegram] ${method} error`, error);
    return { ok: false, description: error instanceof Error ? error.message : String(error) };
  }
}

type InquiryCardInput = Inquiry & { assigneeName?: string | null };

/** The request as staff see it in Telegram. Plain text, so visitor input needs no escaping. */
export function formatInquiryAlert(inquiry: InquiryCardInput, siteUrl: string): string {
  const icon = inquiry.status === "new" ? "🆕" : inquiry.status === "closed" ? "✅" : inquiry.status === "spam" ? "🚫" : "📌";
  const lines = [
    `${icon} ${inquiryTypeLabels[inquiry.type]}${inquiry.status === "new" ? " جديد" : ""} — ${formatInquiryReference(inquiry.id)}`,
    `الاسم: ${inquiry.name}`,
    `الهاتف: ${inquiry.phone}`,
    `طريقة التواصل المفضلة: ${contactMethodLabels[inquiry.preferredContact]}`,
  ];
  if (inquiry.email) lines.push(`البريد: ${inquiry.email}`);
  if (inquiry.company) lines.push(`الشركة: ${inquiry.company}`);
  if (inquiry.productSnapshot) {
    lines.push(`المنتج: ${inquiry.productSnapshot}${inquiry.quantity ? ` × ${inquiry.quantity}` : ""}`);
  } else if (inquiry.quantity) {
    lines.push(`الكمية: ${inquiry.quantity}`);
  }
  if (inquiry.message) lines.push(`الرسالة: ${inquiry.message}`);
  if (inquiry.status !== "new" || inquiry.assigneeName) {
    lines.push("", `الحالة: ${inquiryStatusLabels[inquiry.status]}${inquiry.assigneeName ? ` · المسؤول: ${inquiry.assigneeName}` : ""}`);
  }
  lines.push(`فتح في لوحة التحكم: ${siteUrl.replace(/\/$/, "")}/admin/inquiries/${inquiry.id}`);

  const text = lines.join("\n");
  return text.length > TELEGRAM_MESSAGE_LIMIT ? `${text.slice(0, TELEGRAM_MESSAGE_LIMIT - 1)}…` : text;
}

export const inquiryActions = ["take", "quoted", "closed", "spam", "reopen", "show"] as const;
export type InquiryAction = (typeof inquiryActions)[number];

export type InlineButton = { text: string; callback_data?: string; url?: string };

/** Buttons under a request card. Callback data stays well under Telegram's 64-byte limit. */
export function inquiryKeyboard(inquiry: Pick<Inquiry, "id" | "status">, siteUrl: string): { inline_keyboard: InlineButton[][] } {
  const button = (text: string, action: InquiryAction): InlineButton => ({ text, callback_data: `i:${inquiry.id}:${action}` });
  const finished = inquiry.status === "closed" || inquiry.status === "spam";
  const rows: InlineButton[][] = finished
    ? [[button("↩️ إعادة فتح", "reopen")]]
    : [
        [button("🙋 أنا عليه", "take"), button("📨 تم إرسال عرض", "quoted")],
        [button("✅ إغلاق", "closed"), button("🚫 مزعج", "spam")],
      ];
  // Telegram only accepts https links on buttons (not http://localhost).
  if (siteUrl.startsWith("https://")) rows.push([{ text: "فتح في لوحة التحكم", url: `${siteUrl.replace(/\/$/, "")}/admin/inquiries/${inquiry.id}` }]);
  return { inline_keyboard: rows };
}

/** Sends a message to the configured staff chat. Returns true when Telegram accepted it. Never throws. */
export async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
  fetchImpl: typeof fetch = fetch,
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  if (!config.token || !config.chatId) {
    console.warn("[telegram] skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
    return false;
  }
  const result = await callTelegram(config, "sendMessage", { chat_id: config.chatId, text, disable_web_page_preview: true, ...extra }, fetchImpl);
  return result.ok;
}

/** A new-request alert with its action buttons. */
export function sendInquiryAlert(config: TelegramConfig, inquiry: InquiryCardInput, siteUrl: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  return sendTelegramMessage(config, formatInquiryAlert(inquiry, siteUrl), fetchImpl, { reply_markup: inquiryKeyboard(inquiry, siteUrl) });
}
