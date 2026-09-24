"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, ApiError } from "@/lib/admin-api";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

export function PasswordForm({ required }: { required: boolean }) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirm) return setErrors({ confirm: "كلمتا المرور غير متطابقتين" });
    setBusy(true);
    setErrors({});
    try {
      await adminApi("/api/admin/auth/password", { body: { currentPassword, newPassword } });
      toast.success("تم تغيير كلمة المرور");
      window.location.href = required ? "/admin" : "/admin/account";
    } catch (error) {
      if (error instanceof ApiError) { setErrors(error.fieldErrors); toast.error(error.message); } else toast.error("تعذّر التغيير");
      setBusy(false);
    }
  }

  return <form className="admin-card admin-form max-w-lg" onSubmit={submit} noValidate>
    <h2>تغيير كلمة المرور</h2>
    <label className="admin-field"><span>كلمة المرور الحالية{required ? " (المؤقتة)" : ""}</span><Input type="password" dir="ltr" autoComplete="current-password" value={currentPassword} onChange={event => setCurrent(event.target.value)} />{errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}</label>
    <label className="admin-field"><span>كلمة المرور الجديدة</span><Input type="password" dir="ltr" autoComplete="new-password" value={newPassword} onChange={event => setNew(event.target.value)} /><small>{MIN_PASSWORD_LENGTH} أحرف على الأقل. العبارات الطويلة أسهل للتذكر وأقوى.</small>{errors.newPassword && <span className="field-error">{errors.newPassword}</span>}</label>
    <label className="admin-field"><span>تأكيد كلمة المرور الجديدة</span><Input type="password" dir="ltr" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} />{errors.confirm && <span className="field-error">{errors.confirm}</span>}</label>
    <Button type="submit" disabled={busy} className="w-fit">{busy ? <Loader2 className="animate-spin" /> : <Save />}حفظ كلمة المرور</Button>
    <small className="text-xs text-[#66758b]">سيتم تسجيل خروجك من الأجهزة الأخرى.</small>
  </form>;
}
