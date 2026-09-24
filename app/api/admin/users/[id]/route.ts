import { adminRoute, idParam, parseBody } from "@/lib/server/admin-route";
import { deleteStaff, getStaff, updateStaff } from "@/lib/server/admin/users";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { userUpdateInput } from "@/lib/validation/admin";

type Params = { id: string };

export const PATCH = adminRoute<Params>("users.manage", async ({ request, db, user, params }) => {
  const id = idParam(params.id);
  const input = await parseBody(request, userUpdateInput);
  const before = await getStaff(db, id);
  const after = await updateStaff(db, user, id, input);
  const changes = Object.fromEntries(
    (Object.keys(input) as (keyof typeof input)[]).filter(key => before[key] !== after[key]).map(key => [key, { from: before[key], to: after[key] }]),
  );
  await logAudit(db, { userId: user.id, action: "user.update", entity: "admin_user", entityId: id, details: { email: after.email, ...changes } });
  return jsonData(after);
});

export const DELETE = adminRoute<Params>("users.manage", async ({ db, user, params }) => {
  const removed = await deleteStaff(db, user, idParam(params.id));
  await logAudit(db, { userId: user.id, action: "user.delete", entity: "admin_user", entityId: removed.id, details: { email: removed.email, role: removed.role } });
  return jsonData({ ok: true });
});
