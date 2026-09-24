import { getDb } from "@/db";
import type { Db } from "@/db/types";
import { can, type Capability } from "@/lib/auth/roles";
import { getSessionUser, isSameOrigin, readSessionToken, type SessionUser } from "@/lib/server/auth";
import { discardBody, fieldErrorsFrom, HttpError, jsonError, readJson } from "@/lib/server/http";
import type { ZodType, ZodTypeDef } from "zod";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const NO_STORE = { "cache-control": "no-store" };

export type AdminContext<P> = { request: Request; db: Db; user: SessionUser; params: P };

/**
 * Every admin endpoint goes through here, so no route can skip a check:
 * same-origin for changes (CSRF), a valid session, a forced password change,
 * and the role's capability. "self" means any signed-in staff member.
 */
export function adminRoute<P = Record<string, string>>(capability: Capability | "self", handler: (context: AdminContext<P>) => Promise<Response>) {
  return async (request: Request, context?: { params?: Promise<P> }): Promise<Response> => {
    const response = await run(request, context);
    await discardBody(request);
    return response;
  };

  async function run(request: Request, context?: { params?: Promise<P> }): Promise<Response> {
    try {
      if (MUTATING.has(request.method) && !isSameOrigin(request)) {
        return jsonError(403, "bad_origin", "طلب غير مسموح.", { headers: NO_STORE });
      }
      const db = getDb();
      const user = await getSessionUser(db, readSessionToken(request));
      if (!user) return jsonError(401, "unauthenticated", "يرجى تسجيل الدخول.", { headers: NO_STORE });
      if (user.mustChangePassword && capability !== "self") {
        return jsonError(403, "password_change_required", "يرجى تغيير كلمة المرور المؤقتة أولاً.", { headers: NO_STORE });
      }
      if (capability !== "self" && !can(user.role, capability)) {
        return jsonError(403, "forbidden", "ليست لديك صلاحية لهذا الإجراء.", { headers: NO_STORE });
      }
      const response = await handler({ request, db, user, params: (await context?.params) ?? ({} as P) });
      response.headers.set("cache-control", "no-store");
      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonError(error.status, error.code, error.message, { fieldErrors: error.fieldErrors, headers: NO_STORE });
      }
      console.error(`[admin] ${request.method} ${new URL(request.url).pathname} failed`, error);
      return jsonError(500, "server_error", "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.", { headers: NO_STORE });
    }
  }
}

/** Parses and validates a JSON body, throwing a 400 with field errors when invalid. */
export async function parseBody<T>(request: Request, schema: ZodType<T, ZodTypeDef, unknown>, maxBytes = 64 * 1024): Promise<T> {
  const body = await readJson(request, maxBytes);
  if (body === undefined) throw new HttpError(400, "invalid_body", "تعذّر قراءة البيانات المرسلة.");
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "validation_failed", "يرجى مراجعة الحقول.", fieldErrorsFrom(parsed.error));
  return parsed.data;
}

/** A numeric route id, or a 404. */
export function idParam(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "not_found", "غير موجود.");
  return id;
}
