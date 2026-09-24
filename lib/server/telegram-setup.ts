import { callTelegram, type TelegramConfig } from "@/lib/server/telegram";
import { botCommands } from "@/lib/server/telegram-bot";

export type BotEnv = {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_API_BASE?: string;
  PUBLIC_SITE_URL: string;
};

export type BotStatus = {
  configured: { token: boolean; chatId: boolean; webhookSecret: boolean };
  bot: { username: string; name: string } | null;
  webhook: { url: string; connected: boolean; pendingUpdates: number; lastError: string | null } | null;
  expectedUrl: string;
};

const config = (env: BotEnv): TelegramConfig => ({ token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID, apiBase: env.TELEGRAM_API_BASE || undefined });
export const webhookUrl = (env: BotEnv) => `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/api/telegram/webhook`;

export async function getBotUsername(env: BotEnv): Promise<string | null> {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  const me = await callTelegram<{ username: string }>(config(env), "getMe", {});
  return me.ok && me.result ? me.result.username : null;
}

export async function getBotStatus(env: BotEnv): Promise<BotStatus> {
  const expectedUrl = webhookUrl(env);
  const configured = { token: Boolean(env.TELEGRAM_BOT_TOKEN), chatId: Boolean(env.TELEGRAM_CHAT_ID), webhookSecret: Boolean(env.TELEGRAM_WEBHOOK_SECRET) };
  if (!configured.token) return { configured, bot: null, webhook: null, expectedUrl };
  const [me, info] = await Promise.all([
    callTelegram<{ username: string; first_name: string }>(config(env), "getMe", {}),
    callTelegram<{ url: string; pending_update_count: number; last_error_message?: string }>(config(env), "getWebhookInfo", {}),
  ]);
  return {
    configured,
    bot: me.ok && me.result ? { username: me.result.username, name: me.result.first_name } : null,
    webhook: info.ok && info.result
      ? { url: info.result.url, connected: info.result.url === expectedUrl, pendingUpdates: info.result.pending_update_count, lastError: info.result.last_error_message ?? null }
      : null,
    expectedUrl,
  };
}

/** Points the bot at this website (replacing any previous webhook) and sets its command menu. */
export async function connectBot(env: BotEnv): Promise<{ ok: boolean; error?: string }> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) return { ok: false, error: "أضف TELEGRAM_BOT_TOKEN و TELEGRAM_WEBHOOK_SECRET أولاً." };
  const hook = await callTelegram(config(env), "setWebhook", {
    url: webhookUrl(env),
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
  });
  if (!hook.ok) return { ok: false, error: hook.description };
  await callTelegram(config(env), "setMyCommands", { commands: botCommands });
  return { ok: true };
}
