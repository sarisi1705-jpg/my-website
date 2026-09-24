import { adminRoute } from "@/lib/server/admin-route";
import { listInquiries } from "@/lib/server/admin/inquiries";
import { jsonData } from "@/lib/server/http";
import { inquiryListQuery, toRecord } from "@/lib/validation/admin";

export const GET = adminRoute("inquiries.view", async ({ request, db, user }) =>
  jsonData(await listInquiries(db, inquiryListQuery.parse(toRecord(new URL(request.url).searchParams)), user.id)));
