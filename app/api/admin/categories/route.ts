import { adminRoute, parseBody } from "@/lib/server/admin-route";
import { adminListCategories, createCategory } from "@/lib/server/admin/catalog";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { categoryInput } from "@/lib/validation/admin";

export const GET = adminRoute("catalog.manage", async ({ db }) => jsonData(await adminListCategories(db)));

export const POST = adminRoute("catalog.manage", async ({ request, db, user }) => {
  const row = await createCategory(db, await parseBody(request, categoryInput));
  await logAudit(db, { userId: user.id, action: "category.create", entity: "category", entityId: row.id, details: { slug: row.slug, name: row.name } });
  return jsonData(row, 201);
});
