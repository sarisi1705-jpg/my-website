import { env } from "cloudflare:workers";
import { adminRoute } from "@/lib/server/admin-route";
import { HttpError, jsonData } from "@/lib/server/http";
import { sendTelegramMessage } from "@/lib/server/telegram";

export const POST = adminRoute("settings.manage", async ({ user }) => {
  const sent = await sendTelegramMessage(
    { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID, apiBase: env.TELEGRAM_API_BASE || undefined },
    `✅ رسالة تجريبية من موقع SSPS (أرسلها ${user.name}). تنبيهات الطلبات الجديدة ستصل إلى هذه المحادثة.`,
  );
  if (!sent) throw new HttpError(502, "telegram_failed", "تعذّر الإرسال. تحقق من رمز البوت ومعرّف المحادثة، وأن البوت مضاف إلى المجموعة.");
  return jsonData({ ok: true });
});
