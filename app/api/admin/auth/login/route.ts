import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { logAudit } from "@/lib/server/audit";
import { authenticate, createSession, isSameOrigin, sessionCookie } from "@/lib/server/auth";
import { fieldErrorsFrom, jsonData, jsonError, readJson } from "@/lib/server/http";
import { getClientIp, getUserAgent, hashIp } from "@/lib/server/request-meta";
import { loginInput } from "@/lib/validation/admin";

const NO_STORE = { "cache-control": "no-store" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "bad_origin", "طلب غير مسموح.", { headers: NO_STORE });

  const ip = getClientIp(request);
  const { success: withinLimit } = await env.RL_LOGIN.limit({ key: ip });
  if (!withinLimit) return jsonError(429, "rate_limited", "محاولات كثيرة. يرجى الانتظار دقيقة ثم المحاولة مجدداً.", { headers: NO_STORE });

  const body = await readJson(request, 4096);
  const parsed = loginInput.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_failed", "يرجى إدخال البريد الإلكتروني وكلمة المرور.", { fieldErrors: fieldErrorsFrom(parsed.error), headers: NO_STORE });
  }

  try {
    const db = getDb();
    const result = await authenticate(db, parsed.data.email, parsed.data.password);
    if (!result.ok) {
      await logAudit(db, { userId: null, action: result.reason === "locked" ? "auth.login_locked" : "auth.login_failed", details: { email: parsed.data.email } });
      const message = result.reason === "locked"
        ? "تم إيقاف تسجيل الدخول مؤقتاً بسبب محاولات خاطئة متكررة. حاول بعد 15 دقيقة."
        : "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      return jsonError(401, result.reason === "locked" ? "locked" : "invalid_credentials", message, { headers: NO_STORE });
    }

    const { user } = result;
    const ipHash = await hashIp(ip, env.IP_HASH_SALT ?? "");
    const token = await createSession(db, user.id, { ipHash, userAgent: getUserAgent(request) });
    await logAudit(db, { userId: user.id, action: "auth.login" });
    return jsonData(
      { user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword } },
      200,
      { ...NO_STORE, "set-cookie": sessionCookie(token) },
    );
  } catch (error) {
    console.error("[admin/login] failed", error);
    return jsonError(500, "server_error", "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.", { headers: NO_STORE });
  }
}
