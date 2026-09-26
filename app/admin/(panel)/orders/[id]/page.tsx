import { notFound } from "next/navigation";
import { ChevronRight, MessageCircle, Phone } from "lucide-react";
import { OrderEditor } from "@/components/admin/order-editor";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { formatDateTime, whatsappLink } from "@/lib/admin-format";
import { can } from "@/lib/auth/roles";
import { formatPrice } from "@/lib/format";
import { paymentMethodLabels } from "@/lib/order-constants";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getOrderDetail } from "@/lib/server/admin/orders";
import { listAssignableStaff } from "@/lib/server/admin/users";
import { HttpError } from "@/lib/server/http";
import { siteConfig } from "@/lib/site-config";
import { formatOrderReference } from "@/lib/validation/order";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage("orders.view");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const db = getDb();
  const order = await getOrderDetail(db, id).catch(error => { if (error instanceof HttpError && error.status === 404) notFound(); throw error; });
  const staff = await listAssignableStaff(db);
  const reference = formatOrderReference(order.id);
  const price = (minor: number) => formatPrice(minor, order.currency);

  return <>
    <a href="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-[#1258dc]"><ChevronRight className="size-4" />كل طلبات الشراء</a>
    <header className="admin-page-header">
      <div><h1 dir="ltr" className="text-right">{reference}</h1><p>طلب شراء · {formatDateTime(order.createdAt)}</p></div>
      <div className="flex flex-wrap gap-2"><PaymentStatusBadge status={order.paymentStatus} /><OrderStatusBadge status={order.status} /></div>
    </header>
    {!order.notifiedAt && <p className="admin-notice admin-notice--warning mb-4">لم يصل تنبيه تيليجرام لهذا الطلب. تحقق من إعدادات البوت ثم أعد الإرسال.</p>}

    <section className="admin-card mb-6">
      <h2>المنتجات</h2>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>المنتج</th><th>سعر القطعة</th><th>الكمية</th><th>المجموع</th></tr></thead>
        <tbody>
          {order.items.map(item => <tr key={item.productId}>
            <td><a href={`/product/${item.slug}`} target="_blank" rel="noreferrer">{item.name}</a><div className="muted" dir="ltr">{item.brand} · {item.model}</div></td>
            <td dir="ltr" className="text-right">{price(item.unitPriceMinor)}</td>
            <td>{item.quantity}</td>
            <td dir="ltr" className="text-right">{price(item.lineTotalMinor)}</td>
          </tr>)}
          <tr><td colSpan={3}>المجموع</td><td dir="ltr" className="text-right">{price(order.subtotalMinor)}</td></tr>
          <tr><td colSpan={3}>التوصيل ({siteConfig.store.deliveryZones[order.deliveryZone].label})</td><td dir="ltr" className="text-right">{price(order.deliveryFeeMinor)}</td></tr>
          <tr><td colSpan={3} className="font-bold">الإجمالي</td><td dir="ltr" className="text-right font-bold">{price(order.totalMinor)}</td></tr>
        </tbody>
      </table></div>
    </section>

    <div className="admin-detail-grid">
      <section className="admin-card grid gap-4">
        <h2>بيانات العميل</h2>
        <dl className="admin-dl">
          <dt>الاسم</dt><dd>{order.name}</dd>
          <dt>الهاتف</dt><dd dir="ltr" className="text-right">{order.phone}</dd>
          {order.email && <><dt>البريد</dt><dd dir="ltr" className="text-right">{order.email}</dd></>}
          <dt>الاستلام</dt><dd>{siteConfig.store.deliveryZones[order.deliveryZone].label}</dd>
          {order.city && <><dt>المدينة</dt><dd>{order.city}</dd></>}
          {order.address && <><dt>العنوان</dt><dd>{order.address}</dd></>}
          <dt>طريقة الدفع</dt><dd>{paymentMethodLabels[order.paymentMethod]}</dd>
          <dt>المسؤول</dt><dd>{order.assigneeName ?? "غير مُسند"}</dd>
        </dl>
        {order.customerNotes && <><h3 className="font-bold">ملاحظات العميل</h3><p className="admin-message">{order.customerNotes}</p></>}
        <div className="admin-actions">
          <Button asChild><a href={`tel:${order.phone}`}><Phone />اتصال</a></Button>
          <Button asChild variant="outline"><a href={whatsappLink(order.phone, `مرحباً ${order.name}، بخصوص طلبك ${reference} لدى SSPS`)} target="_blank" rel="noreferrer"><MessageCircle />واتساب</a></Button>
        </div>
      </section>
      {can(user.role, "orders.manage")
        ? <OrderEditor order={order} staff={staff} notified={Boolean(order.notifiedAt)} />
        : <section className="admin-card"><h2>ملاحظات داخلية</h2><p className="admin-message">{order.internalNotes || "—"}</p></section>}
    </div>
  </>;
}
