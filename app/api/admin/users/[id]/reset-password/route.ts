import { adminRoute, idParam, parseBody } from "@/lib/server/admin-route";
import { getStaff, resetStaffPassword } from "@/lib/server/admin/users";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { passwordResetInput } from "@/lib/validation/admin";

export const POST = adminRoute<{ id: string }>("users.manage", async ({ request, db, user, params }) => {
  const id = idParam(params.id);
  const target = await getStaff(db, id);
  const { password } = await parseBody(request, passwordResetInput);
  const { temporaryPassword } = await resetStaffPassword(db, id, password);
  await logAudit(db, { userId: user.id, action: "user.password_reset", entity: "admin_user", entityId: id, details: { email: target.email } });
  return jsonData({ temporaryPassword });
});
