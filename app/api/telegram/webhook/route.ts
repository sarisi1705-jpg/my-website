import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { constantTimeEqual } from "@/lib/auth/password";
import { discardBody, readJson } from "@/lib/server/http";
import { callTelegram } from "@/lib/server/telegram";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/server/telegram-bot";

const encoder = new TextEncoder();

/** Telegram sends the secret we registered with setWebhook in this header. */
function fromTelegram(request: Request): boolean {
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  const received = request.headers.get("x-telegram-bot-api-secret-token");
  return Boolean(expected && received && constantTimeEqual(encoder.encode(received), encoder.encode(expected)));
}

export async function POST(request: Request) {
  if (!fromTelegram(request)) {
    await discardBody(request);
    return new Response("Unauthorized", { status: 401 });
  }
  const update = (await readJson(request, 64 * 1024)) as TelegramUpdate | undefined;
  if (update && typeof update.update_id === "number") {
    const config = { token: env.TELEGRAM_BOT_TOKEN, apiBase: env.TELEGRAM_API_BASE || undefined };
    await handleTelegramUpdate({ db: getDb(), api: (method, body) => callTelegram(config, method, body), siteUrl: env.PUBLIC_SITE_URL }, update);
  }
  // Always 200: a failed update is logged, and retrying it would only repeat the failure.
  return Response.json({ ok: true });
}
