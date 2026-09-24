import { env } from "cloudflare:workers";
import { adminRoute } from "@/lib/server/admin-route";
import { logAudit } from "@/lib/server/audit";
import { HttpError, jsonData } from "@/lib/server/http";
import { connectBot, getBotStatus } from "@/lib/server/telegram-setup";

export const POST = adminRoute("settings.manage", async ({ db, user }) => {
  const result = await connectBot(env);
  if (!result.ok) throw new HttpError(502, "telegram_failed", `تعذّر ربط البوت: ${result.error ?? "خطأ غير معروف"}`);
  await logAudit(db, { userId: user.id, action: "telegram.connect" });
  return jsonData(await getBotStatus(env));
});
