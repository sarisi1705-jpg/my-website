"use client";

import { useState } from "react";
import { Copy, KeyRound, Loader2, Plus, Save, Trash2, UserX, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { ActiveBadge } from "@/components/admin/status-badge";
import { adminApi, ApiError } from "@/lib/admin-api";
import { formatDateTime } from "@/lib/admin-format";
import { adminRoles, roleLabels, type AdminRole } from "@/lib/auth/roles";

type Staff = { id: number; email: string; name: string; role: AdminRole; isActive: boolean; mustChangePassword: boolean; lastLoginAt: number | null; isLocked?: boolean };

const roleHints: Record<AdminRole, string> = {
  owner: "كل الصلاحيات، بما فيها إدارة الموظفين والحذف النهائي",
  editor: "إدارة المنتجات والتصنيفات والعلامات",
  sales: "متابعة الطلبات وتصديرها",
};

/** Shows a temporary password once, with a copy button. */
function PasswordNotice({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  return <div className="admin-notice admin-notice--info mb-4 grid gap-2" role="status">
    <strong>كلمة المرور المؤقتة لـ {email}</strong>
    <div className="flex flex-wrap items-center gap-2">
      <code dir="ltr" className="rounded bg-white px-3 py-1 text-base font-bold tracking-wider">{password}</code>
      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(password).then(() => toast.success("تم النسخ"))}><Copy />نسخ</Button>
      <Button size="sm" variant="ghost" onClick={onClose}><X />إخفاء</Button>
    </div>
    <small>لن تظهر مرة أخرى. أرسلها للموظف بطريقة آمنة؛ سيُطلب منه اختيار كلمة مرور جديدة عند أول دخول.</small>
  </div>;
}

export function UserManager({ users: initialUsers, currentUserId }: { users: Staff[]; currentUserId: number }) {
  const [users, setUsers] = useState(initialUsers);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", role: "sales" as AdminRole });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ email: string; password: string } | null>(null);

  async function create() {
    setBusy(true);
    setErrors({});
    try {
      const { user, temporaryPassword } = await adminApi<{ user: Staff; temporaryPassword: string }>("/api/admin/users", { body: draft });
      setNotice({ email: user.email, password: temporaryPassword });
      setCreating(false);
      setDraft({ name: "", email: "", role: "sales" });
      toast.success("تمت إضافة الموظف");
      // Keep the password on screen: add to the list without a full reload.
      setUsers(current => [...current, user]);
    } catch (error) {
      if (error instanceof ApiError) { setErrors(error.fieldErrors); toast.error(error.message); } else toast.error("تعذّرت الإضافة");
    } finally {
      setBusy(false);
    }
  }

  async function update(user: Staff, changes: Partial<Pick<Staff, "role" | "isActive">>) {
    try {
      await adminApi(`/api/admin/users/${user.id}`, { method: "PATCH", body: changes });
      toast.success("تم التحديث");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر التحديث");
    }
  }

  return <>
    {notice && <PasswordNotice {...notice} onClose={() => { setNotice(null); window.location.reload(); }} />}
    {creating ? <section className="admin-card admin-form mb-4">
      <h2>إضافة موظف</h2>
      <div className="admin-form-grid">
        <label className="admin-field"><span>الاسم *</span><Input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />{errors.name && <span className="field-error">{errors.name}</span>}</label>
        <label className="admin-field"><span>البريد الإلكتروني *</span><Input type="email" dir="ltr" className="text-right" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} />{errors.email && <span className="field-error">{errors.email}</span>}</label>
        <label className="admin-field"><span>الصلاحية</span>
          <select className="admin-select" value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value as AdminRole })}>{adminRoles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>
          <small>{roleHints[draft.role]}</small></label>
      </div>
      <p className="text-sm text-[#66758b]">ستُنشأ كلمة مرور مؤقتة تظهر لك مرة واحدة.</p>
      <div className="admin-actions">
        <Button onClick={create} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Save />}إضافة</Button>
        <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}><X />إلغاء</Button>
      </div>
    </section> : <Button className="mb-4" onClick={() => setCreating(true)}><Plus />إضافة موظف</Button>}

    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>الموظف</th><th>الصلاحية</th><th>الحالة</th><th>آخر دخول</th><th></th></tr></thead>
      <tbody>{users.map(user => {
        const isSelf = user.id === currentUserId;
        return <tr key={user.id}>
          <td><strong>{user.name}</strong>{isSelf && <span className="muted"> (أنت)</span>}<div className="muted" dir="ltr">{user.email}</div>
            {user.mustChangePassword && <div className="muted">بانتظار تغيير كلمة المرور المؤقتة</div>}
            {user.isLocked && <div className="text-xs font-bold text-amber-700">مقفل مؤقتاً بسبب محاولات خاطئة</div>}</td>
          <td>{isSelf ? roleLabels[user.role] : <select className="admin-select" aria-label={`صلاحية ${user.name}`} value={user.role} onChange={event => update(user, { role: event.target.value as AdminRole })}>{adminRoles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>}</td>
          <td><ActiveBadge active={user.isActive} /></td>
          <td className="muted">{formatDateTime(user.lastLoginAt)}</td>
          <td>{!isSelf && <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={() => update(user, { isActive: !user.isActive })}>{user.isActive ? <><UserX />تعطيل</> : <><UserCheck />تفعيل</>}</Button>
            <ConfirmAction
              trigger={<Button variant="ghost" size="sm"><KeyRound />كلمة مرور جديدة</Button>}
              title={`إعادة تعيين كلمة مرور ${user.name}؟`}
              description="ستُنشأ كلمة مرور مؤقتة جديدة، وسيُسجَّل خروجه من كل الأجهزة."
              confirmLabel="إعادة التعيين"
              destructive={false}
              onConfirm={async () => {
                try {
                  const { temporaryPassword } = await adminApi<{ temporaryPassword: string }>(`/api/admin/users/${user.id}/reset-password`, { body: {} });
                  setNotice({ email: user.email, password: temporaryPassword });
                } catch (error) { toast.error(error instanceof ApiError ? error.message : "تعذّرت العملية"); }
              }}
            />
            <ConfirmAction
              trigger={<Button variant="ghost" size="sm" className="text-red-600"><Trash2 />حذف</Button>}
              title={`حذف حساب ${user.name}؟`}
              description="سيُحذف الحساب نهائياً وتُلغى إسنادات طلباته. يُفضّل التعطيل إذا قد يعود لاحقاً."
              confirmLabel="حذف الحساب"
              onConfirm={async () => {
                try { await adminApi(`/api/admin/users/${user.id}`, { method: "DELETE" }); window.location.reload(); }
                catch (error) { toast.error(error instanceof ApiError ? error.message : "تعذّر الحذف"); }
              }}
            />
          </div>}</td>
        </tr>;
      })}</tbody>
    </table></div>
  </>;
}
