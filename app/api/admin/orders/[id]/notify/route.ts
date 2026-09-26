import { env } from "cloudflare:workers";
import { adminRoute, idParam } from "@/lib/server/admin-route";
import { getOrderDetail } from "@/lib/server/admin/orders";
import { HttpError, jsonData } from "@/lib/server/http";
import { markOrderNotified } from "@/lib/server/orders";
import { sendOrderAlert } from "@/lib/server/telegram";

// Resends the Telegram alert, e.g. after fixing the bot settings.
export const POST = adminRoute<{ id: string }>("orders.manage", async ({ db, params }) => {
  const order = await getOrderDetail(db, idParam(params.id));
  const sent = await sendOrderAlert(
    { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID, apiBase: env.TELEGRAM_API_BASE || undefined },
    order,
    env.PUBLIC_SITE_URL,
  );
  if (!sent) throw new HttpError(502, "telegram_failed", "تعذّر إرسال التنبيه إلى تيليجرام. تحقق من إعدادات البوت.");
  await markOrderNotified(db, order.id);
  return jsonData({ ok: true });
});
