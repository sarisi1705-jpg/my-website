import { can } from "@/lib/auth/roles";
import { InquiryStatusBadge, OrderStatusBadge } from "@/components/admin/status-badge";
import { getDb } from "@/db";
import { formatDateTime } from "@/lib/admin-format";
import { DEFAULT_CURRENCY } from "@/lib/catalog-constants";
import { formatPrice } from "@/lib/format";
import { requireAdminPage } from "@/lib/server/admin-page";
import { productStatusCounts } from "@/lib/server/admin/catalog";
import { inquiryDashboardStats } from "@/lib/server/admin/inquiries";
import { orderDashboardStats } from "@/lib/server/admin/orders";
import { formatInquiryReference, inquiryTypeLabels } from "@/lib/validation/inquiry";
import { formatOrderReference } from "@/lib/validation/order";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireAdminPage("dashboard.view");
  const { denied } = await searchParams;
  const db = getDb();
  const [orders, inquiries, products] = await Promise.all([
    can(user.role, "orders.view") ? orderDashboardStats(db) : null,
    can(user.role, "inquiries.view") ? inquiryDashboardStats(db) : null,
    can(user.role, "catalog.manage") ? productStatusCounts(db) : null,
  ]);

  return <>
    <header className="admin-page-header"><div><h1>أهلاً، {user.name}</h1><p>نظرة سريعة على الطلبات والمنتجات.</p></div></header>
    {denied && <p className="admin-notice admin-notice--warning mb-4">ليست لديك صلاحية لفتح تلك الصفحة.</p>}

    {orders && <>
      <div className="admin-stats">
        <a className="admin-stat" href="/admin/orders?status=new"><strong>{orders.byStatus.new ?? 0}</strong><span>طلبات شراء جديدة</span></a>
        <a className="admin-stat" href="/admin/orders?status=confirmed"><strong>{(orders.byStatus.confirmed ?? 0) + (orders.byStatus.shipped ?? 0)}</strong><span>قيد التنفيذ</span></a>
        <div className="admin-stat"><strong dir="ltr">{formatPrice(orders.revenue30, DEFAULT_CURRENCY)}</strong><span>مبيعات آخر 30 يوماً</span></div>
        <a className={`admin-stat${orders.notNotified ? " admin-stat--alert" : ""}`} href="/admin/orders?status=new"><strong>{orders.notNotified}</strong><span>جديدة لم يصل تنبيهها</span></a>
      </div>
      {orders.recent.length > 0 && <section className="admin-card mb-6">
        <h2>أحدث طلبات الشراء</h2>
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>الرقم</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th></tr></thead>
          <tbody>{orders.recent.map(order => <tr key={order.id}>
            <td><a href={`/admin/orders/${order.id}`} dir="ltr">{formatOrderReference(order.id)}</a></td>
            <td className="muted">{formatDateTime(order.createdAt)}</td>
            <td>{order.name}</td>
            <td dir="ltr" className="text-right">{formatPrice(order.totalMinor, order.currency)}</td>
            <td><OrderStatusBadge status={order.status} /></td>
          </tr>)}</tbody>
        </table></div>
      </section>}
    </>}

    {inquiries && <>
      <div className="admin-stats">
        <a className="admin-stat" href="/admin/inquiries?status=new"><strong>{inquiries.byStatus.new ?? 0}</strong><span>طلبات جديدة</span></a>
        <a className="admin-stat" href="/admin/inquiries?status=in_progress"><strong>{inquiries.byStatus.in_progress ?? 0}</strong><span>قيد المتابعة</span></a>
        <div className="admin-stat"><strong>{inquiries.lastDay}</strong><span>خلال آخر 24 ساعة</span></div>
        <a className={`admin-stat${inquiries.notNotified ? " admin-stat--alert" : ""}`} href="/admin/inquiries?status=new"><strong>{inquiries.notNotified}</strong><span>جديدة لم يصل تنبيهها</span></a>
      </div>
      <section className="admin-card mb-6">
        <h2>أحدث الطلبات</h2>
        {inquiries.recent.length ? <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>الرقم</th><th>التاريخ</th><th>الاسم</th><th>النوع</th><th>الحالة</th></tr></thead>
          <tbody>{inquiries.recent.map(item => <tr key={item.id}>
            <td><a href={`/admin/inquiries/${item.id}`} dir="ltr">{formatInquiryReference(item.id)}</a></td>
            <td className="muted">{formatDateTime(item.createdAt)}</td>
            <td>{item.name}</td>
            <td>{inquiryTypeLabels[item.type]}</td>
            <td><InquiryStatusBadge status={item.status} /></td>
          </tr>)}</tbody>
        </table></div> : <p className="admin-empty">لا توجد طلبات بعد.</p>}
      </section>
    </>}

    {products && <div className="admin-stats">
      <a className="admin-stat" href="/admin/products?status=published"><strong>{products.published ?? 0}</strong><span>منتجات منشورة</span></a>
      <a className="admin-stat" href="/admin/products?status=draft"><strong>{products.draft ?? 0}</strong><span>مسودات</span></a>
      <a className="admin-stat" href="/admin/products?status=archived"><strong>{products.archived ?? 0}</strong><span>مؤرشفة</span></a>
    </div>}
  </>;
}
