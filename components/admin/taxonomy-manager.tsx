"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { ActiveBadge } from "@/components/admin/status-badge";
import { adminApi, ApiError } from "@/lib/admin-api";
import { iconKeys } from "@/lib/catalog-constants";
import { CategoryIcon } from "@/lib/icons";

export type TaxonomyRow = { id: number; slug: string; name: string; sortOrder: number; isActive: boolean; productCount: number; description?: string; iconKey?: string };
type Draft = Omit<TaxonomyRow, "id" | "productCount">;

const iconLabels: Record<string, string> = { printer: "طابعة", droplets: "حبر", gauge: "صيانة", box: "ورق/صندوق", wrench: "أدوات", monitor: "شاشة", scan: "ماسح", package: "طرد", cpu: "إلكترونيات", file: "مستند" };

/** Inline create/edit for categories (with description and icon) or brands. */
export function TaxonomyManager({ kind, rows }: { kind: "categories" | "brands"; rows: TaxonomyRow[] }) {
  const isCategory = kind === "categories";
  const empty: Draft = { slug: "", name: "", sortOrder: (rows.at(-1)?.sortOrder ?? 0) + 1, isActive: true, ...(isCategory ? { description: "", iconKey: "package" } : {}) };
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const label = isCategory ? "التصنيف" : "العلامة";

  function start(row?: TaxonomyRow) {
    setErrors({});
    setEditing(row ? row.id : "new");
    setDraft(row ? { slug: row.slug, name: row.name, sortOrder: row.sortOrder, isActive: row.isActive, description: row.description, iconKey: row.iconKey } : empty);
  }

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      await adminApi(editing === "new" ? `/api/admin/${kind}` : `/api/admin/${kind}/${editing}`, { method: editing === "new" ? "POST" : "PATCH", body: draft });
      toast.success("تم الحفظ");
      window.location.reload();
    } catch (error) {
      if (error instanceof ApiError) { setErrors(error.fieldErrors); toast.error(error.message); } else toast.error("تعذّر الحفظ");
      setSaving(false);
    }
  }

  const form = <div className="admin-card admin-form mb-4">
    <h2>{editing === "new" ? `إضافة ${label}` : `تعديل ${label}`}</h2>
    <div className="admin-form-grid">
      <label className="admin-field"><span>الاسم *</span><Input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />{errors.name && <span className="field-error">{errors.name}</span>}</label>
      <label className="admin-field"><span>الرابط {isCategory ? "*" : ""}</span><Input dir="ltr" className="text-right" value={draft.slug} placeholder={isCategory ? "printers" : "يُنشأ من الاسم"} onChange={event => setDraft({ ...draft, slug: event.target.value })} />
        <small>أحرف إنجليزية صغيرة وأرقام وشرطات{isCategory ? " — يظهر في عنوان الصفحة /products/…" : ""}</small>{errors.slug && <span className="field-error">{errors.slug}</span>}</label>
      {isCategory && <label className="admin-field"><span>الأيقونة</span>
        <select className="admin-select" value={draft.iconKey} onChange={event => setDraft({ ...draft, iconKey: event.target.value })}>{iconKeys.map(key => <option key={key} value={key}>{iconLabels[key] ?? key}</option>)}</select></label>}
      <label className="admin-field"><span>ترتيب الظهور</span><Input type="number" min={0} value={draft.sortOrder} onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) })} /></label>
    </div>
    {isCategory && <label className="admin-field"><span>الوصف</span><Input value={draft.description ?? ""} maxLength={300} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>}
    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-4" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} />فعّال (يظهر في الموقع)</label>
    <div className="admin-actions">
      <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}حفظ</Button>
      <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}><X />إلغاء</Button>
    </div>
  </div>;

  return <>
    {editing === null ? <Button className="mb-4" onClick={() => start()}><Plus />إضافة {label}</Button> : form}
    <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>الاسم</th><th>الرابط</th><th>المنتجات</th><th>الترتيب</th><th>الحالة</th><th></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <td><div className="flex items-center gap-2">{isCategory && <CategoryIcon iconKey={row.iconKey} className="size-4 text-[#1258dc]" aria-hidden="true" />}<strong>{row.name}</strong></div>{row.description && <div className="muted">{row.description}</div>}</td>
        <td dir="ltr" className="text-right muted">{row.slug}</td>
        <td>{row.productCount}</td>
        <td>{row.sortOrder}</td>
        <td><ActiveBadge active={row.isActive} /></td>
        <td><div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`تعديل ${row.name}`} onClick={() => start(row)}><Pencil /></Button>
          <ConfirmAction
            trigger={<Button variant="ghost" size="icon" className="text-red-600" aria-label={`حذف ${row.name}`}><Trash2 /></Button>}
            title={`حذف ${row.name}؟`}
            description={row.productCount ? `مرتبط بـ ${row.productCount} منتج، لذلك لن يُحذف. عطّله بدلاً من ذلك.` : "لا يمكن التراجع عن الحذف."}
            confirmLabel="حذف"
            onConfirm={async () => {
              try { await adminApi(`/api/admin/${kind}/${row.id}`, { method: "DELETE" }); window.location.reload(); }
              catch (error) { toast.error(error instanceof ApiError ? error.message : "تعذّر الحذف"); }
            }}
          />
        </div></td>
      </tr>)}</tbody>
    </table></div>
  </>;
}
