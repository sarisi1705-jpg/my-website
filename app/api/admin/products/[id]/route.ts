import { env } from "cloudflare:workers";
import { can } from "@/lib/auth/roles";
import { adminRoute, idParam, parseBody } from "@/lib/server/admin-route";
import { archiveProduct, deleteProduct, getAdminProduct, updateProduct } from "@/lib/server/admin/catalog";
import { logAudit } from "@/lib/server/audit";
import { HttpError, jsonData } from "@/lib/server/http";
import { deleteProductImage } from "@/lib/server/images";
import { productInput } from "@/lib/validation/admin";

type Params = { id: string };

export const GET = adminRoute<Params>("catalog.manage", async ({ db, params }) => jsonData(await getAdminProduct(db, idParam(params.id))));

export const PATCH = adminRoute<Params>("catalog.manage", async ({ request, db, user, params }) => {
  const { product, replacedImageKey } = await updateProduct(db, idParam(params.id), await parseBody(request, productInput), user.id);
  await deleteProductImage(env.BUCKET, replacedImageKey);
  await logAudit(db, { userId: user.id, action: "product.update", entity: "product", entityId: product.id, details: { slug: product.slug, status: product.status } });
  return jsonData(product);
});

/** Archives by default; ?hard=1 deletes permanently (owners only). */
export const DELETE = adminRoute<Params>("catalog.manage", async ({ request, db, user, params }) => {
  const id = idParam(params.id);
  if (new URL(request.url).searchParams.get("hard") === "1") {
    if (!can(user.role, "products.hardDelete")) throw new HttpError(403, "forbidden", "الحذف النهائي متاح للمالك فقط.");
    const removed = await deleteProduct(db, id);
    await deleteProductImage(env.BUCKET, removed.imageKey);
    await logAudit(db, { userId: user.id, action: "product.delete", entity: "product", entityId: id, details: { slug: removed.slug, name: removed.name } });
    return jsonData({ ok: true, deleted: true });
  }
  const archived = await archiveProduct(db, id, user.id);
  await logAudit(db, { userId: user.id, action: "product.archive", entity: "product", entityId: id, details: { slug: archived.slug } });
  return jsonData(archived);
});
