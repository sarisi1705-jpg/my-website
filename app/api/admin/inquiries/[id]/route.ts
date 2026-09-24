import { adminRoute, idParam, parseBody } from "@/lib/server/admin-route";
import { deleteInquiry, getInquiryDetail, updateInquiry } from "@/lib/server/admin/inquiries";
import { logAudit } from "@/lib/server/audit";
import { jsonData } from "@/lib/server/http";
import { inquiryUpdateInput } from "@/lib/validation/admin";

type Params = { id: string };

export const GET = adminRoute<Params>("inquiries.view", async ({ db, params }) => jsonData(await getInquiryDetail(db, idParam(params.id))));

export const PATCH = adminRoute<Params>("inquiries.manage", async ({ request, db, user, params }) => {
  const id = idParam(params.id);
  const input = await parseBody(request, inquiryUpdateInput);
  const { before, after } = await updateInquiry(db, id, input);
  const changes = Object.fromEntries(
    (Object.keys(input) as (keyof typeof input)[]).filter(key => before[key] !== after[key]).map(key => [key, { from: before[key], to: after[key] }]),
  );
  if (Object.keys(changes).length) await logAudit(db, { userId: user.id, action: "inquiry.update", entity: "inquiry", entityId: id, details: changes });
  return jsonData(after);
});

export const DELETE = adminRoute<Params>("inquiries.delete", async ({ db, user, params }) => {
  const removed = await deleteInquiry(db, idParam(params.id));
  await logAudit(db, { userId: user.id, action: "inquiry.delete", entity: "inquiry", entityId: removed.id, details: { name: removed.name, phone: removed.phone } });
  return jsonData({ ok: true });
});
