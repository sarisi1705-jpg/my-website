import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { can, type Capability } from "@/lib/auth/roles";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "@/lib/server/auth";

export async function currentAdmin(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSessionUser(getDb(), token);
}

/**
 * Guards an admin page: signed in, temporary password changed, and allowed to
 * see this page. Missing permission goes back to the dashboard.
 */
export async function requireAdminPage(capability?: Capability, options: { allowPasswordChange?: boolean } = {}): Promise<SessionUser> {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  if (user.mustChangePassword && !options.allowPasswordChange) redirect("/admin/account?required=1");
  if (capability && !can(user.role, capability)) redirect("/admin?denied=1");
  return user;
}
