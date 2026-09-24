import { Download } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { InquiryStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { formatDateTime } from "@/lib/admin-format";
import { can } from "@/lib/auth/roles";
import { inquiryStatuses, inquiryStatusLabels, inquiryTypes } from "@/lib/inquiry-constants";
import { requireAdminPage } from "@/lib/server/admin-page";
import { listInquiries } from "@/lib/server/admin/inquiries";
import { listAssignableStaff } from "@/lib/server/admin/users";
import { inquiryListQuery } from "@/lib/validation/admin";
import { formatInquiryReference, inquiryTypeLabels } from "@/lib/validation/inquiry";

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAdminPage("inquiries.view");
  const query = inquiryListQuery.parse(await searchParams);
  const db = getDb();
  const [result, staff] = await Promise.all([listInquiries(db, query, user.id), listAssignableStaff(db)]);
  const params = { status: query.status, type: query.type, q: query.q, from: query.from, to: query.to, assigned: query.assigned };
  const exportQuery = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();

  return <>
    <header className="admin-page-header">
      <div><h1>الطلبات</h1><p>طلبات عروض الأسعار والخدمة والاستفسارات من الموقع.</p></div>
      {can(user.role, "inquiries.export") && <Button asChild variant="outline"><a href={`/api/admin/inquiries/export${exportQuery ? `?${exportQuery}` : ""}`}><Download />تصدير CSV</a></Button>}
    </header>

    {/* A plain GET form: filters live in the URL and work without JavaScript. */}
    <form className="admin-filters" method="get">
      <label>بحث<input type="search" name="q" defaultValue={query.q} placeholder="الاسم، الهاتف أو رقم الطلب" /></label>
      <label>الحالة<select name="status" defaultValue={query.status ?? ""}><option value="">الكل</option>{inquiryStatuses.map(status => <option key={status} value={status}>{inquiryStatusLabels[status]}</option>)}</select></label>
      <label>النوع<select name="type" defaultValue={query.type ?? ""}><option value="">الكل</option>{inquiryTypes.map(type => <option key={type} value={type}>{inquiryTypeLabels[type]}</option>)}</select></label>
      <label>المسؤول<select name="assigned" defaultValue={query.assigned ?? ""}><option value="">الكل</option><option value="me">طلباتي</option><option value="none">غير مُسند</option>{staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label>من<input type="date" name="from" defaultValue={query.from} /></label>
      <label>إلى<input type="date" name="to" defaultValue={query.to} /></label>
      <Button type="submit">تطبيق</Button>
      {Object.values(params).some(Boolean) && <Button asChild variant="ghost"><a href="/admin/inquiries">مسح</a></Button>}
    </form>

    {result.items.length ? <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>الرقم</th><th>التاريخ</th><th>الاسم</th><th>الهاتف</th><th>النوع</th><th>المنتج</th><th>الحالة</th><th>المسؤول</th></tr></thead>
      <tbody>{result.items.map(item => <tr key={item.id}>
        <td><a href={`/admin/inquiries/${item.id}`} dir="ltr">{formatInquiryReference(item.id)}</a></td>
        <td className="muted">{formatDateTime(item.createdAt)}</td>
        <td>{item.name}{item.company && <div className="muted">{item.company}</div>}</td>
        <td dir="ltr" className="text-right">{item.phone}</td>
        <td>{inquiryTypeLabels[item.type]}</td>
        <td className="muted">{item.productSnapshot ?? "—"}</td>
        <td><InquiryStatusBadge status={item.status} /></td>
        <td className="muted">{item.assigneeName ?? "—"}</td>
      </tr>)}</tbody>
    </table></div> : <div className="admin-card admin-empty">لا توجد طلبات مطابقة.</div>}
    <AdminPagination basePath="/admin/inquiries" params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
  </>;
}
