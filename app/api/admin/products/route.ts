import { adminRoute, parseBody } from "@/lib/server/admin-route";
import { adminListProducts, createProduct } from "@/lib/server/admin/catalog";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { adminProductListQuery, productInput, toRecord } from "@/lib/validation/admin";

export const GET = adminRoute("catalog.manage", async ({ request, db }) =>
  jsonData(await adminListProducts(db, adminProductListQuery.parse(toRecord(new URL(request.url).searchParams)))));

export const POST = adminRoute("catalog.manage", async ({ request, db, user }) => {
  const product = await createProduct(db, await parseBody(request, productInput), user.id);
  await logAudit(db, { userId: user.id, action: "product.create", entity: "product", entityId: product.id, details: { slug: product.slug, status: product.status } });
  return jsonData(product, 201);
});
