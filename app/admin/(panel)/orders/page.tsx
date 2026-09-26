import { AdminPagination } from "@/components/admin/admin-pagination";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { formatDateTime } from "@/lib/admin-format";
import { formatPrice } from "@/lib/format";
import { orderStatuses, orderStatusLabels, paymentMethodLabels, paymentStatuses, paymentStatusLabels } from "@/lib/order-constants";
import { requireAdminPage } from "@/lib/server/admin-page";
import { listOrders } from "@/lib/server/admin/orders";
import { orderListQuery } from "@/lib/validation/admin";
import { formatOrderReference } from "@/lib/validation/order";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("orders.view");
  const query = orderListQuery.parse(await searchParams);
  const result = await listOrders(getDb(), query);
  const params = { status: query.status, paymentStatus: query.paymentStatus, q: query.q, from: query.from, to: query.to };

  return <>
    <header className="admin-page-header">
      <div><h1>طلبات الشراء</h1><p>الطلبات المُرسلة من متجر الموقع.</p></div>
    </header>

    {/* A plain GET form: filters live in the URL and work without JavaScript. */}
    <form className="admin-filters" method="get">
      <label>بحث<input type="search" name="q" defaultValue={query.q} placeholder="الاسم، الهاتف أو رقم الطلب" /></label>
      <label>الحالة<select name="status" defaultValue={query.status ?? ""}><option value="">الكل</option>{orderStatuses.map(status => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select></label>
      <label>الدفع<select name="paymentStatus" defaultValue={query.paymentStatus ?? ""}><option value="">الكل</option>{paymentStatuses.map(status => <option key={status} value={status}>{paymentStatusLabels[status]}</option>)}</select></label>
      <label>من<input type="date" name="from" defaultValue={query.from} /></label>
      <label>إلى<input type="date" name="to" defaultValue={query.to} /></label>
      <Button type="submit">تطبيق</Button>
      {Object.values(params).some(Boolean) && <Button asChild variant="ghost"><a href="/admin/orders">مسح</a></Button>}
    </form>

    {result.items.length ? <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>الرقم</th><th>التاريخ</th><th>العميل</th><th>الهاتف</th><th>القطع</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th>المسؤول</th></tr></thead>
      <tbody>{result.items.map(order => <tr key={order.id}>
        <td><a href={`/admin/orders/${order.id}`} dir="ltr">{formatOrderReference(order.id)}</a></td>
        <td className="muted">{formatDateTime(order.createdAt)}</td>
        <td>{order.name}{order.city && <div className="muted">{order.city}</div>}</td>
        <td dir="ltr" className="text-right">{order.phone}</td>
        <td>{order.items.reduce((total, item) => total + item.quantity, 0)}</td>
        <td dir="ltr" className="text-right font-bold">{formatPrice(order.totalMinor, order.currency)}</td>
        <td><PaymentStatusBadge status={order.paymentStatus} /><div className="muted">{paymentMethodLabels[order.paymentMethod]}</div></td>
        <td><OrderStatusBadge status={order.status} /></td>
        <td className="muted">{order.assigneeName ?? "—"}</td>
      </tr>)}</tbody>
    </table></div> : <div className="admin-card admin-empty">لا توجد طلبات مطابقة.</div>}
    <AdminPagination basePath="/admin/orders" params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
  </>;
}
