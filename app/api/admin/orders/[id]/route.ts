import { adminRoute, idParam, parseBody } from "@/lib/server/admin-route";
import { getOrderDetail, updateOrder } from "@/lib/server/admin/orders";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { orderUpdateInput } from "@/lib/validation/admin";

type Params = { id: string };

export const GET = adminRoute<Params>("orders.view", async ({ db, params }) => jsonData(await getOrderDetail(db, idParam(params.id))));

// No DELETE on purpose: an order is a sales record. Cancel it instead.
export const PATCH = adminRoute<Params>("orders.manage", async ({ request, db, user, params }) => {
  const id = idParam(params.id);
  const input = await parseBody(request, orderUpdateInput);
  const { before, after } = await updateOrder(db, id, input);
  const changes = Object.fromEntries(
    (Object.keys(input) as (keyof typeof input)[]).filter(key => before[key] !== after[key]).map(key => [key, { from: before[key], to: after[key] }]),
  );
  if (Object.keys(changes).length) await logAudit(db, { userId: user.id, action: "order.update", entity: "order", entityId: id, details: changes });
  return jsonData(after);
});
