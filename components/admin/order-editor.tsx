"use client";

import { useState } from "react";
import { BellRing, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, ApiError } from "@/lib/admin-api";
import { orderStatuses, orderStatusLabels, paymentStatuses, paymentStatusLabels, type OrderStatus, type PaymentStatus } from "@/lib/order-constants";

export function OrderEditor({ order, staff, notified }: {
  order: { id: number; status: OrderStatus; paymentStatus: PaymentStatus; assignedTo: number | null; internalNotes: string };
  staff: { id: number; name: string }[];
  notified: boolean;
}) {
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [assignedTo, setAssignedTo] = useState<number | null>(order.assignedTo);
  const [notes, setNotes] = useState(order.internalNotes);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const dirty = status !== order.status || paymentStatus !== order.paymentStatus || assignedTo !== order.assignedTo || notes !== order.internalNotes;

  async function save() {
    setSaving(true);
    try {
      await adminApi(`/api/admin/orders/${order.id}`, { method: "PATCH", body: { status, paymentStatus, assignedTo, internalNotes: notes } });
      toast.success("تم حفظ التغييرات");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر الحفظ");
      setSaving(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await adminApi(`/api/admin/orders/${order.id}/notify`, { method: "POST" });
      toast.success("تم إرسال التنبيه إلى تيليجرام");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر الإرسال");
      setResending(false);
    }
  }

  return <section className="admin-card admin-form">
    <h2>المتابعة</h2>
    <label className="admin-field"><span>حالة الطلب</span>
      <select className="admin-select" value={status} onChange={event => setStatus(event.target.value as OrderStatus)}>
        {orderStatuses.map(option => <option key={option} value={option}>{orderStatusLabels[option]}</option>)}
      </select>
    </label>
    <label className="admin-field"><span>حالة الدفع</span>
      <select className="admin-select" value={paymentStatus} onChange={event => setPaymentStatus(event.target.value as PaymentStatus)}>
        {paymentStatuses.map(option => <option key={option} value={option}>{paymentStatusLabels[option]}</option>)}
      </select>
    </label>
    <label className="admin-field"><span>المسؤول</span>
      <select className="admin-select" value={assignedTo ?? ""} onChange={event => setAssignedTo(event.target.value ? Number(event.target.value) : null)}>
        <option value="">غير مُسند</option>
        {staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
      </select>
    </label>
    <label className="admin-field"><span>ملاحظات داخلية</span>
      <Textarea rows={5} value={notes} maxLength={5000} onChange={event => setNotes(event.target.value)} placeholder="لا تظهر للعميل" />
    </label>
    <div className="admin-actions">
      <Button onClick={save} disabled={!dirty || saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}حفظ</Button>
      {!notified && <Button variant="outline" onClick={resend} disabled={resending}>{resending ? <Loader2 className="animate-spin" /> : <BellRing />}إعادة إرسال التنبيه</Button>}
    </div>
  </section>;
}
