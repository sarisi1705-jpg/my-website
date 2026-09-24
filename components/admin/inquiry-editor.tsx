"use client";

import { useState } from "react";
import { BellRing, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminApi, ApiError } from "@/lib/admin-api";
import { inquiryStatuses, inquiryStatusLabels, type InquiryStatus } from "@/lib/inquiry-constants";

export function InquiryEditor({ inquiry, staff, canDelete, notified }: {
  inquiry: { id: number; status: InquiryStatus; assignedTo: number | null; internalNotes: string };
  staff: { id: number; name: string }[];
  canDelete: boolean;
  notified: boolean;
}) {
  const [status, setStatus] = useState(inquiry.status);
  const [assignedTo, setAssignedTo] = useState<number | null>(inquiry.assignedTo);
  const [notes, setNotes] = useState(inquiry.internalNotes);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const dirty = status !== inquiry.status || assignedTo !== inquiry.assignedTo || notes !== inquiry.internalNotes;

  async function save() {
    setSaving(true);
    try {
      await adminApi(`/api/admin/inquiries/${inquiry.id}`, { method: "PATCH", body: { status, assignedTo, internalNotes: notes } });
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
      await adminApi(`/api/admin/inquiries/${inquiry.id}/notify`, { method: "POST" });
      toast.success("تم إرسال التنبيه إلى تيليجرام");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر الإرسال");
      setResending(false);
    }
  }

  return <section className="admin-card admin-form">
    <h2>المتابعة</h2>
    <label className="admin-field"><span>الحالة</span>
      <select className="admin-select" value={status} onChange={event => setStatus(event.target.value as InquiryStatus)}>
        {inquiryStatuses.map(option => <option key={option} value={option}>{inquiryStatusLabels[option]}</option>)}
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
      {canDelete && <ConfirmAction
        trigger={<Button variant="ghost" className="text-red-600"><Trash2 />حذف</Button>}
        title="حذف الطلب نهائياً؟"
        description="سيُحذف الطلب وبيانات العميل المرتبطة به نهائياً ولا يمكن التراجع."
        confirmLabel="حذف نهائي"
        onConfirm={async () => {
          try {
            await adminApi(`/api/admin/inquiries/${inquiry.id}`, { method: "DELETE" });
            window.location.href = "/admin/inquiries";
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "تعذّر الحذف");
          }
        }}
      />}
    </div>
  </section>;
}
