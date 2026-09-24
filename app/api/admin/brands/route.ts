import { adminRoute, parseBody } from "@/lib/server/admin-route";
import { adminListBrands, createBrand } from "@/lib/server/admin/catalog";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { brandInput } from "@/lib/validation/admin";

export const GET = adminRoute("catalog.manage", async ({ db }) => jsonData(await adminListBrands(db)));

export const POST = adminRoute("catalog.manage", async ({ request, db, user }) => {
  const row = await createBrand(db, await parseBody(request, brandInput));
  await logAudit(db, { userId: user.id, action: "brand.create", entity: "brand", entityId: row.id, details: { slug: row.slug, name: row.name } });
  return jsonData(row, 201);
});
