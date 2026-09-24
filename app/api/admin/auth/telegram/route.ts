import { env } from "cloudflare:workers";
import { adminRoute } from "@/lib/server/admin-route";
import { createTelegramLinkCode, unlinkTelegramAccount } from "@/lib/server/admin/users";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { getBotUsername } from "@/lib/server/telegram-setup";

/** A one-time code to send to the bot as "/link <code>". */
export const POST = adminRoute("self", async ({ db, user }) => {
  const { code, expiresAt } = await createTelegramLinkCode(db, user.id);
  return jsonData({ code, expiresAt, botUsername: await getBotUsername(env) });
});

export const DELETE = adminRoute("self", async ({ db, user }) => {
  await unlinkTelegramAccount(db, user.id);
  await logAudit(db, { userId: user.id, action: "telegram.unlink", entity: "admin_user", entityId: user.id });
  return jsonData({ ok: true });
});
