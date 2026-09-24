import { adminRoute, parseBody } from "@/lib/server/admin-route";
import { changeOwnPassword } from "@/lib/server/admin/users";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { passwordChangeInput } from "@/lib/validation/admin";

export const POST = adminRoute("self", async ({ request, db, user }) => {
  const input = await parseBody(request, passwordChangeInput);
  await changeOwnPassword(db, user, input.currentPassword, input.newPassword);
  await logAudit(db, { userId: user.id, action: "auth.password_changed", entity: "admin_user", entityId: user.id });
  return jsonData({ ok: true });
});
