import { and, asc, count, eq } from "drizzle-orm";
import { adminUsers, inquiries, sessions, type AdminUser } from "@/db/schema";
import type { Db } from "@/db/types";
import { can, type AdminRole } from "@/lib/auth/roles";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { HttpError } from "@/lib/server/http";
import { destroyUserSessions, normalizeEmail, type SessionUser } from "@/lib/server/auth";

export type StaffMember = Omit<AdminUser, "passwordHash" | "failedLogins">;

const publicColumns = {
  id: adminUsers.id,
  email: adminUsers.email,
  name: adminUsers.name,
  role: adminUsers.role,
  mustChangePassword: adminUsers.mustChangePassword,
  isActive: adminUsers.isActive,
  lockedUntil: adminUsers.lockedUntil,
  lastLoginAt: adminUsers.lastLoginAt,
  createdAt: adminUsers.createdAt,
  updatedAt: adminUsers.updatedAt,
};

export async function listStaff(db: Db, now = Date.now()): Promise<(StaffMember & { isLocked: boolean })[]> {
  const rows = await db.select(publicColumns).from(adminUsers).orderBy(asc(adminUsers.name));
  return rows.map(row => ({ ...row, isLocked: Boolean(row.lockedUntil && row.lockedUntil > now) }));
}

export async function getStaff(db: Db, id: number): Promise<StaffMember> {
  const user = await db.select(publicColumns).from(adminUsers).where(eq(adminUsers.id, id)).get();
  if (!user) throw new HttpError(404, "not_found", "الحساب غير موجود.");
  return user;
}

/** Active staff who can be given inquiries (owners and sales). */
export async function listAssignableStaff(db: Db): Promise<{ id: number; name: string }[]> {
  const active = await db.select({ id: adminUsers.id, name: adminUsers.name, role: adminUsers.role }).from(adminUsers).where(eq(adminUsers.isActive, true)).orderBy(asc(adminUsers.name));
  return active.filter(user => can(user.role, "inquiries.manage")).map(({ id, name }) => ({ id, name }));
}

async function activeOwnerCount(db: Db): Promise<number> {
  const [{ total }] = await db.select({ total: count() }).from(adminUsers).where(and(eq(adminUsers.role, "owner"), eq(adminUsers.isActive, true)));
  return total;
}

async function assertNotLastOwner(db: Db, target: StaffMember) {
  if (target.role === "owner" && target.isActive && (await activeOwnerCount(db)) <= 1) {
    throw new HttpError(409, "last_owner", "لا يمكن إزالة صلاحية المالك الوحيد. أضف مالكاً آخر أولاً.");
  }
}

export async function createStaff(
  db: Db,
  input: { email: string; name: string; role: AdminRole; password?: string },
  now = Date.now(),
): Promise<{ user: StaffMember; temporaryPassword?: string }> {
  const email = normalizeEmail(input.email);
  if (await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).get()) {
    throw new HttpError(409, "email_taken", "يوجد حساب بهذا البريد الإلكتروني.", { email: "يوجد حساب بهذا البريد الإلكتروني" });
  }
  const temporaryPassword = input.password ? undefined : generateTemporaryPassword();
  const [row] = await db
    .insert(adminUsers)
    .values({
      email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password ?? temporaryPassword!),
      // Whoever sets the first password, the new staff member picks their own.
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: adminUsers.id });
  return { user: await getStaff(db, row.id), temporaryPassword };
}

export async function updateStaff(
  db: Db,
  actor: SessionUser,
  id: number,
  input: { name?: string; role?: AdminRole; isActive?: boolean },
  now = Date.now(),
): Promise<StaffMember> {
  const target = await getStaff(db, id);
  if (id === actor.id && (input.role !== undefined && input.role !== target.role || input.isActive === false)) {
    throw new HttpError(409, "self_lockout", "لا يمكنك تغيير صلاحيتك أو تعطيل حسابك بنفسك.");
  }
  const losesOwner = (input.role !== undefined && input.role !== "owner") || input.isActive === false;
  if (losesOwner) await assertNotLastOwner(db, target);

  await db.update(adminUsers).set({ ...input, updatedAt: now }).where(eq(adminUsers.id, id));
  if (input.isActive === false || (input.role !== undefined && input.role !== target.role)) {
    // New permissions (or none) take effect immediately: sign them out everywhere.
    await destroyUserSessions(db, id);
  }
  return getStaff(db, id);
}

export async function deleteStaff(db: Db, actor: SessionUser, id: number): Promise<StaffMember> {
  const target = await getStaff(db, id);
  if (id === actor.id) throw new HttpError(409, "self_delete", "لا يمكنك حذف حسابك بنفسك.");
  await assertNotLastOwner(db, target);
  await db.batch([
    db.delete(sessions).where(eq(sessions.userId, id)),
    db.update(inquiries).set({ assignedTo: null }).where(eq(inquiries.assignedTo, id)),
    db.delete(adminUsers).where(eq(adminUsers.id, id)),
  ]);
  return target;
}

/** Sets a new temporary password (generated when not given) and signs the person out everywhere. */
export async function resetStaffPassword(db: Db, id: number, password?: string, now = Date.now()): Promise<{ temporaryPassword?: string }> {
  await getStaff(db, id);
  const temporaryPassword = password ? undefined : generateTemporaryPassword();
  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(password ?? temporaryPassword!), mustChangePassword: true, failedLogins: 0, lockedUntil: null, updatedAt: now })
    .where(eq(adminUsers.id, id));
  await destroyUserSessions(db, id);
  return { temporaryPassword };
}

/** Changes the signed-in person's own password; other sessions are signed out. */
export async function changeOwnPassword(db: Db, actor: SessionUser, currentPassword: string, newPassword: string, now = Date.now()): Promise<void> {
  const user = await db.select({ passwordHash: adminUsers.passwordHash }).from(adminUsers).where(eq(adminUsers.id, actor.id)).get();
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(400, "wrong_password", "كلمة المرور الحالية غير صحيحة.", { currentPassword: "كلمة المرور الحالية غير صحيحة" });
  }
  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(newPassword), mustChangePassword: false, updatedAt: now })
    .where(eq(adminUsers.id, actor.id));
  await destroyUserSessions(db, actor.id, actor.sessionId);
}
