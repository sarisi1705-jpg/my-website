import { env } from "cloudflare:workers";
import { adminRoute, idParam } from "@/lib/server/admin-route";
import { getInquiryDetail } from "@/lib/server/admin/inquiries";
import { HttpError, jsonData } from "@/lib/server/http";
import { markInquiryNotified } from "@/lib/server/inquiries";
import { sendInquiryAlert } from "@/lib/server/telegram";

// Resends the Telegram alert, e.g. after fixing the bot settings.
export const POST = adminRoute<{ id: string }>("inquiries.manage", async ({ db, params }) => {
  const inquiry = await getInquiryDetail(db, idParam(params.id));
  const sent = await sendInquiryAlert(
    { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID, apiBase: env.TELEGRAM_API_BASE || undefined },
    inquiry,
    env.PUBLIC_SITE_URL,
  );
  if (!sent) throw new HttpError(502, "telegram_failed", "تعذّر إرسال التنبيه إلى تيليجرام. تحقق من إعدادات البوت.");
  await markInquiryNotified(db, inquiry.id);
  return jsonData({ ok: true });
});
