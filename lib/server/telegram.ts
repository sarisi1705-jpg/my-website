import type { Inquiry } from "@/db/schema";
import { contactMethodLabels, formatInquiryReference, inquiryTypeLabels } from "@/lib/validation/inquiry";

const TELEGRAM_MESSAGE_LIMIT = 4096;

/** Plain-text alert for staff. Plain text means visitor input needs no escaping. */
export function formatInquiryAlert(inquiry: Inquiry, siteUrl: string): string {
  const lines = [
    `🆕 ${inquiryTypeLabels[inquiry.type]} جديد — ${formatInquiryReference(inquiry.id)}`,
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
  lines.push(`فتح في لوحة التحكم: ${siteUrl.replace(/\/$/, "")}/admin/inquiries/${inquiry.id}`);

  const text = lines.join("\n");
  return text.length > TELEGRAM_MESSAGE_LIMIT ? `${text.slice(0, TELEGRAM_MESSAGE_LIMIT - 1)}…` : text;
}

export type TelegramConfig = {
  token: string | undefined;
  chatId: string | undefined;
  // Overridable for local testing; defaults to the real Bot API.
  apiBase?: string;
};

/** Returns true when Telegram accepted the message. Never throws. */
export async function sendTelegramMessage(
  { token, chatId, apiBase = "https://api.telegram.org" }: TelegramConfig,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || !chatId) {
    console.warn("[telegram] skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
    return false;
  }
  try {
    const response = await fetchImpl(`${apiBase}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!response.ok) {
      console.error(`[telegram] sendMessage failed with HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[telegram] sendMessage error", error);
    return false;
  }
}
