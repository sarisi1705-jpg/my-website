import { adminRoute } from "@/lib/server/admin-route";
import { listAudit } from "@/lib/server/admin/inquiries";
import { jsonData } from "@/lib/server/http";
import { pageQuery, toRecord } from "@/lib/validation/admin";

export const GET = adminRoute("audit.view", async ({ request, db }) => {
  const { page } = pageQuery.parse(toRecord(new URL(request.url).searchParams));
  return jsonData(await listAudit(db, page));
});
