import { adminRoute } from "@/lib/server/admin-route";
import { jsonData } from "@/lib/server/http";

export const GET = adminRoute("self", async ({ user }) =>
  jsonData({ id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword }));
