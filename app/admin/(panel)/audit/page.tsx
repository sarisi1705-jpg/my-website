import { AdminPagination } from "@/components/admin/admin-pagination";
import { getDb } from "@/db";
import { formatDateTime } from "@/lib/admin-format";
import { requireAdminPage } from "@/lib/server/admin-page";
import { listAudit } from "@/lib/server/admin/inquiries";
import { pageQuery } from "@/lib/validation/admin";

const actionLabels: Record<string, string> = {
  "auth.login": "تسجيل دخول", "auth.logout": "تسجيل خروج", "auth.login_failed": "محاولة دخول فاشلة", "auth.login_locked": "إيقاف الدخول مؤقتاً",
  "auth.password_changed": "تغيير كلمة المرور",
  "inquiry.update": "تحديث طلب", "inquiry.delete": "حذف طلب", "inquiry.export": "تصدير الطلبات",
  "product.create": "إضافة منتج", "product.update": "تعديل منتج", "product.archive": "أرشفة منتج", "product.delete": "حذف منتج", "image.upload": "رفع صورة",
  "category.create": "إضافة تصنيف", "category.update": "تعديل تصنيف", "category.delete": "حذف تصنيف",
  "brand.create": "إضافة علامة", "brand.update": "تعديل علامة", "brand.delete": "حذف علامة",
  "telegram.connect": "ربط البوت بالموقع", "telegram.link": "ربط حساب تيليجرام", "telegram.unlink": "فصل حساب تيليجرام",
  "user.create": "إضافة موظف", "user.update": "تعديل موظف", "user.delete": "حذف موظف", "user.password_reset": "إعادة تعيين كلمة مرور",
};

function describe(details: Record<string, unknown> | null): string {
  if (!details) return "";
  return Object.entries(details)
    .map(([key, value]) => (key === "via" && value === "telegram" ? ["عبر", "تيليجرام"] as const : [key, value] as const))
    .map(([key, value]) => {
      if (value && typeof value === "object" && "from" in value && "to" in value) {
        const change = value as { from: unknown; to: unknown };
        return `${key}: ${String(change.from ?? "—")} ← ${String(change.to ?? "—")}`;
      }
      return `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`;
    })
    .join(" · ");
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("audit.view");
  const { page } = pageQuery.parse(await searchParams);
  const result = await listAudit(getDb(), page);
  return <>
    <header className="admin-page-header"><div><h1>سجل النشاط</h1><p>من قام بماذا ومتى في لوحة التحكم.</p></div></header>
    {result.items.length ? <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>الوقت</th><th>الموظف</th><th>الإجراء</th><th>التفاصيل</th></tr></thead>
      <tbody>{result.items.map(entry => <tr key={entry.id}>
        <td className="muted whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
        <td>{entry.actorName ?? <span className="muted">—</span>}</td>
        <td>{actionLabels[entry.action] ?? entry.action}{entry.entityId && <span className="muted"> #{entry.entityId}</span>}</td>
        <td className="muted" dir="auto">{describe(entry.details)}</td>
      </tr>)}</tbody>
    </table></div> : <div className="admin-card admin-empty">لا يوجد نشاط بعد.</div>}
    <AdminPagination basePath="/admin/audit" params={{}} page={result.page} pageCount={result.pageCount} total={result.total} />
  </>;
}
