import { and, eq, gt, ne } from "drizzle-orm";
import { adminUsers, sessions, type AdminUser } from "@/db/schema";
import type { Db } from "@/db/types";
import { DUMMY_PASSWORD_HASH, hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { sha256Hex } from "@/lib/server/request-meta";

export const SESSION_COOKIE = "ssps_session";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** A session ends after 7 days without use, and 30 days after login at the latest. */
export const SESSION_IDLE_MS = 7 * DAY;
export const SESSION_MAX_MS = 30 * DAY;
const SESSION_RENEW_AFTER_MS = HOUR;
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export type SessionUser = Pick<AdminUser, "id" | "email" | "name" | "role" | "mustChangePassword"> & { sessionId: string };

export type AuthResult = { ok: true; user: AdminUser } | { ok: false; reason: "invalid" | "locked" };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks an email and password. Every failure looks the same to the caller
 * except an active lockout, and unknown emails still pay for a hash check so
 * response times don't reveal which emails have accounts.
 */
export async function authenticate(db: Db, email: string, password: string, now = Date.now()): Promise<AuthResult> {
  const user = await db.select().from(adminUsers).where(eq(adminUsers.email, normalizeEmail(email))).get();
  if (!user) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return { ok: false, reason: "invalid" };
  }
  if (user.lockedUntil && user.lockedUntil > now) return { ok: false, reason: "locked" };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLogins + 1;
    const locked = failed >= MAX_FAILED_LOGINS;
    await db
      .update(adminUsers)
      .set({ failedLogins: locked ? 0 : failed, lockedUntil: locked ? now + LOCKOUT_MS : user.lockedUntil })
      .where(eq(adminUsers.id, user.id));
    return { ok: false, reason: locked ? "locked" : "invalid" };
  }
  if (!user.isActive) return { ok: false, reason: "invalid" };

  const upgradedHash = needsRehash(user.passwordHash) ? await hashPassword(password) : undefined;
  const [updated] = await db
    .update(adminUsers)
    .set({ failedLogins: 0, lockedUntil: null, lastLoginAt: now, ...(upgradedHash ? { passwordHash: upgradedHash } : {}) })
    .where(eq(adminUsers.id, user.id))
    .returning();
  return { ok: true, user: updated };
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Starts a session and returns the token for the cookie. Only its hash is stored. */
export async function createSession(db: Db, userId: number, meta: { ipHash: string | null; userAgent: string | null }, now = Date.now()): Promise<string> {
  const token = randomToken();
  await db.insert(sessions).values({
    id: await sha256Hex(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + SESSION_IDLE_MS,
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
  });
  return token;
}

/** The signed-in staff member for a token, or null. Extends the session while it's in use. */
export async function getSessionUser(db: Db, token: string | null | undefined, now = Date.now()): Promise<SessionUser | null> {
  if (!token) return null;
  const sessionId = await sha256Hex(token);
  const row = await db
    .select({
      sessionId: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      mustChangePassword: adminUsers.mustChangePassword,
    })
    .from(sessions)
    .innerJoin(adminUsers, eq(sessions.userId, adminUsers.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now), eq(adminUsers.isActive, true)))
    .get();
  if (!row) return null;

  if (now - row.lastSeenAt > SESSION_RENEW_AFTER_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: now, expiresAt: Math.min(row.createdAt + SESSION_MAX_MS, now + SESSION_IDLE_MS) })
      .where(eq(sessions.id, sessionId));
  }
  return { sessionId: row.sessionId, id: row.id, email: row.email, name: row.name, role: row.role, mustChangePassword: row.mustChangePassword };
}

export async function destroySession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, await sha256Hex(token)));
}

/** Signs a staff member out everywhere (optionally keeping the current session). */
export async function destroyUserSessions(db: Db, userId: number, keepSessionId?: string): Promise<void> {
  await db.delete(sessions).where(keepSessionId ? and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)) : eq(sessions.userId, userId));
}

// ── Cookies and request checks ─────────────────────────────────────────────

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_MS / 1000}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE) return value.join("=") || null;
  }
  return null;
}

/**
 * CSRF guard for cookie-authenticated changes: the browser's Origin header
 * must match this site. Requests without an Origin (not sent by browsers for
 * cross-site form posts we care about) are refused too.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
