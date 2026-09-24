import { env } from "cloudflare:workers";
import { after } from "next/server";
import { getDb, type Db } from "@/db";
import { getPublishedProductById } from "@/lib/server/catalog";
import { fieldErrorsFrom, jsonData, jsonError, readJson } from "@/lib/server/http";
import { createInquiry, markInquiryNotified } from "@/lib/server/inquiries";
import { getClientIp, getUserAgent, hashIp } from "@/lib/server/request-meta";
import { formatInquiryAlert, sendTelegramMessage } from "@/lib/server/telegram";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { formatInquiryReference, inquiryRequest } from "@/lib/validation/inquiry";

const MAX_BODY_BYTES = 16 * 1024;

// Saved with the inquiry so staff see what was asked for even if the product changes later.
async function resolveProductSnapshot(db: Db, productId: number | undefined): Promise<string | null> {
  if (!productId) return null;
  const product = await getPublishedProductById(db, productId);
  return product ? `${product.name} (${product.brand.name} ${product.model})` : null;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const { success: withinLimit } = await env.RL_INQUIRY.limit({ key: ip });
  if (!withinLimit) {
    return jsonError(429, "rate_limited", "أرسلت عدة طلبات خلال وقت قصير. يرجى الانتظار دقيقة ثم المحاولة مجدداً.");
  }

  const body = await readJson(request, MAX_BODY_BYTES);
  if (body === undefined) return jsonError(400, "invalid_body", "تعذّر قراءة الطلب. يرجى المحاولة مرة أخرى.");

  const parsed = inquiryRequest.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_failed", "يرجى مراجعة الحقول المطلوبة.", {
      fieldErrors: fieldErrorsFrom(parsed.error, "fields"),
    });
  }
  const { fields, turnstileToken, website, sourcePath } = parsed.data;

  // Honeypot filled in: answer like a success so the bot learns nothing, store nothing.
  if (website) return jsonData({ id: 0, reference: formatInquiryReference(0) }, 201);

  const turnstile = await verifyTurnstile({ secret: env.TURNSTILE_SECRET_KEY, token: turnstileToken, ip });
  if (!turnstile.ok) {
    console.warn(`[inquiries] turnstile rejected: ${turnstile.reason}`);
    return jsonError(403, "verification_failed", "تعذّر التحقق من أنك لست روبوتاً. يرجى إعادة المحاولة.");
  }

  try {
    const db = getDb();
    const inquiry = await createInquiry(db, fields, {
      productSnapshot: await resolveProductSnapshot(db, fields.productId),
      sourcePath: sourcePath ?? null,
      ipHash: await hashIp(ip, env.IP_HASH_SALT ?? ""),
      userAgent: getUserAgent(request),
    });

    // Runs after the response is sent, so the visitor never waits on Telegram.
    after(async () => {
      const sent = await sendTelegramMessage(
        { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID, apiBase: env.TELEGRAM_API_BASE || undefined },
        formatInquiryAlert(inquiry, env.PUBLIC_SITE_URL),
      );
      if (sent) await markInquiryNotified(db, inquiry.id);
    });

    return jsonData({ id: inquiry.id, reference: formatInquiryReference(inquiry.id) }, 201);
  } catch (error) {
    console.error("[inquiries] failed to save inquiry", error);
    return jsonError(500, "server_error", "حدث خطأ أثناء حفظ طلبك. يرجى المحاولة لاحقاً أو التواصل معنا هاتفياً.");
  }
}
