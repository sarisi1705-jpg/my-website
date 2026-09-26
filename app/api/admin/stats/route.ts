import { can } from "@/lib/auth/roles";
import { adminRoute } from "@/lib/server/admin-route";
import { productStatusCounts } from "@/lib/server/admin/catalog";
import { inquiryDashboardStats } from "@/lib/server/admin/inquiries";
import { orderDashboardStats } from "@/lib/server/admin/orders";
import { jsonData } from "@/lib/server/http";

export const GET = adminRoute("dashboard.view", async ({ db, user }) => {
  const [orders, inquiries, products] = await Promise.all([
    can(user.role, "orders.view") ? orderDashboardStats(db) : null,
    can(user.role, "inquiries.view") ? inquiryDashboardStats(db) : null,
    can(user.role, "catalog.manage") ? productStatusCounts(db) : null,
  ]);
  return jsonData({ orders, inquiries, products });
});
