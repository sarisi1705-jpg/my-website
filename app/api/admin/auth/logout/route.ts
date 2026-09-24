import { getDb } from "@/db";
import { logAudit } from "@/lib/server/audit";
import { clearedSessionCookie, destroySession, getSessionUser, isSameOrigin, readSessionToken } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";

// Not wrapped in adminRoute: signing out must work even with an expired session.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "bad_origin", "طلب غير مسموح.");
  const token = readSessionToken(request);
  if (token) {
    const db = getDb();
    const user = await getSessionUser(db, token);
    await destroySession(db, token);
    if (user) await logAudit(db, { userId: user.id, action: "auth.logout" });
  }
  return jsonData({ ok: true }, 200, { "cache-control": "no-store", "set-cookie": clearedSessionCookie() });
}
