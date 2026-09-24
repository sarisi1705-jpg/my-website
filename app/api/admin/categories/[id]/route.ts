import { adminRoute, idParam, parseBody } from "@/lib/server/admin-route";
import { deleteCategory, updateCategory } from "@/lib/server/admin/catalog";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { categoryInput } from "@/lib/validation/admin";

type Params = { id: string };

export const PATCH = adminRoute<Params>("catalog.manage", async ({ request, db, user, params }) => {
  const row = await updateCategory(db, idParam(params.id), await parseBody(request, categoryInput));
  await logAudit(db, { userId: user.id, action: "category.update", entity: "category", entityId: row.id, details: { slug: row.slug, name: row.name, isActive: row.isActive } });
  return jsonData(row);
});

export const DELETE = adminRoute<Params>("catalog.manage", async ({ db, user, params }) => {
  const removed = await deleteCategory(db, idParam(params.id));
  await logAudit(db, { userId: user.id, action: "category.delete", entity: "category", entityId: removed.id, details: { slug: removed.slug, name: removed.name } });
  return jsonData({ ok: true });
});
