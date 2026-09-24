import { adminRoute, idParam, parseBody } from "@/lib/server/admin-route";
import { deleteBrand, updateBrand } from "@/lib/server/admin/catalog";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { brandInput } from "@/lib/validation/admin";

type Params = { id: string };

export const PATCH = adminRoute<Params>("catalog.manage", async ({ request, db, user, params }) => {
  const row = await updateBrand(db, idParam(params.id), await parseBody(request, brandInput));
  await logAudit(db, { userId: user.id, action: "brand.update", entity: "brand", entityId: row.id, details: { slug: row.slug, name: row.name, isActive: row.isActive } });
  return jsonData(row);
});

export const DELETE = adminRoute<Params>("catalog.manage", async ({ db, user, params }) => {
  const removed = await deleteBrand(db, idParam(params.id));
  await logAudit(db, { userId: user.id, action: "brand.delete", entity: "brand", entityId: removed.id, details: { slug: removed.slug, name: removed.name } });
  return jsonData({ ok: true });
});
