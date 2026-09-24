import { adminRoute } from "@/lib/server/admin-route";
import { exportInquiriesCsv } from "@/lib/server/admin/inquiries";
import { logAudit } from "@/lib/server/audit";
import { inquiryListQuery, toRecord } from "@/lib/validation/admin";

export const GET = adminRoute("inquiries.export", async ({ request, db, user }) => {
  const query = inquiryListQuery.parse(toRecord(new URL(request.url).searchParams));
  const csv = await exportInquiriesCsv(db, query, user.id);
  await logAudit(db, { userId: user.id, action: "inquiry.export", details: { ...query } });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="ssps-inquiries-${date}.csv"` },
  });
});
