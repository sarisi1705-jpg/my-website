import { adminRoute, parseBody } from "@/lib/server/admin-route";
import { createStaff, listStaff } from "@/lib/server/admin/users";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { userCreateInput } from "@/lib/validation/admin";

export const GET = adminRoute("users.manage", async ({ db }) => jsonData(await listStaff(db)));

export const POST = adminRoute("users.manage", async ({ request, db, user }) => {
  const { user: created, temporaryPassword } = await createStaff(db, await parseBody(request, userCreateInput));
  await logAudit(db, { userId: user.id, action: "user.create", entity: "admin_user", entityId: created.id, details: { email: created.email, role: created.role } });
  // The temporary password is returned once and never stored in plain text.
  return jsonData({ user: created, temporaryPassword }, 201);
});
