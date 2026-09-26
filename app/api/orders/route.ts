import { env } from "cloudflare:workers";
import { after } from "next/server";
import { getDb } from "@/db";
import { discardBody, fieldErrorsFrom, jsonData, jsonError, readJson } from "@/lib/server/http";
import { createOrder, deliveryFeeMinor, markOrderNotified, priceCart } from "@/lib/server/orders";
import { getClientIp, getUserAgent, hashIp } from "@/lib/server/request-meta";
import { sendOrderAlert } from "@/lib/server/telegram";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { formatOrderReference, orderRequest } from "@/lib/validation/order";

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const response = await handle(request);
  await discardBody(request);
  return response;
}

async function handle(request: Request): Promise<Response> {
  const ip = getClientIp(request);

  const { success: withinLimit } = await env.RL_ORDER.limit({ key: ip });
  if (!withinLimit) {
    return jsonError(429, "rate_limited", "أرسلت عدة طلبات خلال وقت قصير. يرجى الانتظار دقيقة ثم المحاولة مجدداً.");
  }

  const body = await readJson(request, MAX_BODY_BYTES);
  if (body === undefined) return jsonError(400, "invalid_body", "تعذّر قراءة الطلب. يرجى المحاولة مرة أخرى.");

  const parsed = orderRequest.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_failed", "يرجى مراجعة الحقول المطلوبة.", {
      fieldErrors: fieldErrorsFrom(parsed.error, "fields"),
    });
  }
  const { fields, items, expectedTotalMinor, turnstileToken, website } = parsed.data;

  // Honeypot filled in: answer like a success so the bot learns nothing, store nothing.
  if (website) return jsonData({ id: 0, reference: formatOrderReference(0) }, 201);

  const turnstile = await verifyTurnstile({ secret: env.TURNSTILE_SECRET_KEY, token: turnstileToken, ip });
  if (!turnstile.ok) {
    console.warn(`[orders] turnstile rejected: ${turnstile.reason}`);
    return jsonError(403, "verification_failed", "تعذّر التحقق من أنك لست روبوتاً. يرجى إعادة المحاولة.");
  }

  try {
    const db = getDb();
    const cart = await priceCart(db, items);
    // Never charge something the shopper didn't see: a product that went away
    // or a price that changed sends them back to review the cart.
    if (cart.unavailable.length || !cart.lines.length) {
      return jsonError(409, "cart_changed", "بعض المنتجات في سلتك لم تعد متاحة للشراء. راجع السلة ثم أكمل الطلب.");
    }
    if (cart.subtotalMinor + deliveryFeeMinor(fields.deliveryZone) !== expectedTotalMinor) {
      return jsonError(409, "price_changed", "تغيّرت أسعار بعض المنتجات. راجع الإجمالي الجديد ثم أكّد الطلب.");
    }

    const order = await createOrder(db, fields, cart, {
      ipHash: await hashIp(ip, env.IP_HASH_SALT ?? ""),
      userAgent: getUserAgent(request),
    });

    // Runs after the response is sent, so the shopper never waits on Telegram.
    after(async () => {
      const sent = await sendOrderAlert(
        { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID, apiBase: env.TELEGRAM_API_BASE || undefined },
        order,
        env.PUBLIC_SITE_URL,
      );
      if (sent) await markOrderNotified(db, order.id);
    });

    return jsonData({ id: order.id, reference: formatOrderReference(order.id), totalMinor: order.totalMinor }, 201);
  } catch (error) {
    console.error("[orders] failed to save order", error);
    return jsonError(500, "server_error", "حدث خطأ أثناء حفظ طلبك. يرجى المحاولة لاحقاً أو التواصل معنا هاتفياً.");
  }
}
