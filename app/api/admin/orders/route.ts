import { adminRoute } from "@/lib/server/admin-route";
import { listOrders } from "@/lib/server/admin/orders";
import { jsonData } from "@/lib/server/http";
import { orderListQuery, toRecord } from "@/lib/validation/admin";

export const GET = adminRoute("orders.view", async ({ request, db }) =>
  jsonData(await listOrders(db, orderListQuery.parse(toRecord(new URL(request.url).searchParams)))));
