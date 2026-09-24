import { can } from "@/lib/auth/roles";
import { adminRoute } from "@/lib/server/admin-route";
import { productStatusCounts } from "@/lib/server/admin/catalog";
import { inquiryDashboardStats } from "@/lib/server/admin/inquiries";
import { jsonData } from "@/lib/server/http";

export const GET = adminRoute("dashboard.view", async ({ db, user }) => {
  const [inquiries, products] = await Promise.all([
    can(user.role, "inquiries.view") ? inquiryDashboardStats(db) : null,
    can(user.role, "catalog.manage") ? productStatusCounts(db) : null,
  ]);
  return jsonData({ inquiries, products });
});
