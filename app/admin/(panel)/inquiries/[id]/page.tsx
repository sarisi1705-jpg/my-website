import { notFound } from "next/navigation";
import { ChevronRight, MessageCircle, Phone } from "lucide-react";
import { InquiryEditor } from "@/components/admin/inquiry-editor";
import { InquiryStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { formatDateTime, whatsappLink } from "@/lib/admin-format";
import { can } from "@/lib/auth/roles";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getInquiryDetail } from "@/lib/server/admin/inquiries";
import { listAssignableStaff } from "@/lib/server/admin/users";
import { HttpError } from "@/lib/server/http";
import { contactMethodLabels, formatInquiryReference, inquiryTypeLabels } from "@/lib/validation/inquiry";

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage("inquiries.view");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const db = getDb();
  const inquiry = await getInquiryDetail(db, id).catch(error => { if (error instanceof HttpError && error.status === 404) notFound(); throw error; });
  const staff = await listAssignableStaff(db);
  const reference = formatInquiryReference(inquiry.id);

  return <>
    <a href="/admin/inquiries" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-[#1258dc]"><ChevronRight className="size-4" />كل الطلبات</a>
    <header className="admin-page-header">
      <div><h1 dir="ltr" className="text-right">{reference}</h1><p>{inquiryTypeLabels[inquiry.type]} · {formatDateTime(inquiry.createdAt)}</p></div>
      <InquiryStatusBadge status={inquiry.status} />
    </header>
    {!inquiry.notifiedAt && <p className="admin-notice admin-notice--warning mb-4">لم يصل تنبيه تيليجرام لهذا الطلب. تحقق من إعدادات البوت ثم أعد الإرسال.</p>}

    <div className="admin-detail-grid">
      <section className="admin-card grid gap-4">
        <h2>بيانات العميل</h2>
        <dl className="admin-dl">
          <dt>الاسم</dt><dd>{inquiry.name}</dd>
          <dt>الهاتف</dt><dd dir="ltr" className="text-right">{inquiry.phone}</dd>
          <dt>التواصل المفضل</dt><dd>{contactMethodLabels[inquiry.preferredContact]}</dd>
          {inquiry.email && <><dt>البريد</dt><dd dir="ltr" className="text-right">{inquiry.email}</dd></>}
          {inquiry.company && <><dt>الشركة</dt><dd>{inquiry.company}</dd></>}
          {inquiry.productSnapshot && <><dt>المنتج</dt><dd>{inquiry.productSnapshot}</dd></>}
          {inquiry.quantity && <><dt>الكمية</dt><dd>{inquiry.quantity}</dd></>}
          {inquiry.sourcePath && <><dt>أُرسل من</dt><dd dir="ltr" className="text-right">{inquiry.sourcePath}</dd></>}
          <dt>المسؤول</dt><dd>{inquiry.assigneeName ?? "غير مُسند"}</dd>
        </dl>
        {inquiry.message && <><h3 className="font-bold">الرسالة</h3><p className="admin-message">{inquiry.message}</p></>}
        <div className="admin-actions">
          <Button asChild><a href={`tel:${inquiry.phone}`}><Phone />اتصال</a></Button>
          <Button asChild variant="outline"><a href={whatsappLink(inquiry.phone, `مرحباً ${inquiry.name}، بخصوص طلبك ${reference} لدى SSPS`)} target="_blank" rel="noreferrer"><MessageCircle />واتساب</a></Button>
        </div>
      </section>
      {can(user.role, "inquiries.manage")
        ? <InquiryEditor inquiry={inquiry} staff={staff} canDelete={can(user.role, "inquiries.delete")} notified={Boolean(inquiry.notifiedAt)} />
        : <section className="admin-card"><h2>ملاحظات داخلية</h2><p className="admin-message">{inquiry.internalNotes || "—"}</p></section>}
    </div>
  </>;
}
