"use client";

import { useState } from "react";
import { Archive, ExternalLink, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { ImageUploader } from "@/components/admin/image-uploader";
import { adminApi, ApiError } from "@/lib/admin-api";
import { productStatuses, type ProductStatus } from "@/lib/catalog-constants";

export type ProductFormValues = {
  name: string; model: string; slug: string; brandId: number | ""; categoryId: number | ""; description: string; specs: string[];
  color: string; imageKey: string | null; price: string; featured: boolean; status: ProductStatus; sortOrder: number;
};

const statusLabels: Record<ProductStatus, string> = { draft: "مسودة (غير ظاهر)", published: "منشور (ظاهر في الموقع)", archived: "مؤرشف (مخفي)" };

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}{hint && !error && <small>{hint}</small>}{error && <span className="field-error" role="alert">{error}</span>}</label>;
}

export function ProductForm({ productId, initial, brands, categories, canHardDelete }: {
  productId?: number;
  initial: ProductFormValues;
  brands: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  canHardDelete: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setValues(current => ({ ...current, [key]: value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const body = { ...values, specs: values.specs.filter(spec => spec.trim()) };
      const saved = await adminApi<{ id: number }>(productId ? `/api/admin/products/${productId}` : "/api/admin/products", { method: productId ? "PATCH" : "POST", body });
      toast.success(productId ? "تم حفظ المنتج" : "تمت إضافة المنتج");
      window.location.href = `/admin/products/${saved.id}?saved=1`;
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        toast.error(error.message);
      } else toast.error("تعذّر الحفظ");
      setSaving(false);
    }
  }

  async function remove(hard: boolean) {
    try {
      await adminApi(`/api/admin/products/${productId}${hard ? "?hard=1" : ""}`, { method: "DELETE" });
      toast.success(hard ? "تم حذف المنتج" : "تمت أرشفة المنتج");
      window.location.href = hard ? "/admin/products" : `/admin/products/${productId}`;
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر تنفيذ العملية");
    }
  }

  return <form className="admin-form" onSubmit={save} noValidate>
    <section className="admin-card admin-form">
      <h2>المعلومات الأساسية</h2>
      <div className="admin-form-grid">
        <Field label="اسم المنتج *" error={errors.name}><Input value={values.name} onChange={event => set("name", event.target.value)} placeholder="مثال: طابعة ليزر مكتبية" /></Field>
        <Field label="الموديل" error={errors.model}><Input dir="ltr" className="text-right" value={values.model} onChange={event => set("model", event.target.value)} placeholder="VersaLink B415" /></Field>
        <Field label="العلامة التجارية *" error={errors.brandId}>
          <select className="admin-select" value={values.brandId} onChange={event => set("brandId", event.target.value ? Number(event.target.value) : "")}>
            <option value="">اختر…</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </Field>
        <Field label="التصنيف *" error={errors.categoryId}>
          <select className="admin-select" value={values.categoryId} onChange={event => set("categoryId", event.target.value ? Number(event.target.value) : "")}>
            <option value="">اختر…</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="الوصف" error={errors.description}><Textarea rows={4} value={values.description} onChange={event => set("description", event.target.value)} maxLength={2000} /></Field>
      <div className="admin-field">
        <span>المواصفات</span>
        {values.specs.map((spec, index) => <div key={index} className="flex gap-2">
          <Input value={spec} maxLength={120} aria-label={`مواصفة ${index + 1}`} onChange={event => set("specs", values.specs.map((item, i) => (i === index ? event.target.value : item)))} />
          <Button type="button" variant="ghost" size="icon" aria-label="حذف المواصفة" onClick={() => set("specs", values.specs.filter((_, i) => i !== index))}><X /></Button>
        </div>)}
        {values.specs.length < 20 && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set("specs", [...values.specs, ""])}><Plus />إضافة مواصفة</Button>}
        {errors.specs && <span className="field-error">{errors.specs}</span>}
      </div>
    </section>

    <section className="admin-card admin-form">
      <h2>الصورة والسعر والظهور</h2>
      <ImageUploader value={values.imageKey} onChange={key => set("imageKey", key)} />
      {errors.imageKey && <span className="field-error">{errors.imageKey}</span>}
      <div className="admin-form-grid">
        <Field label="السعر (₪)" error={errors.price} hint="اتركه فارغاً ليظهر «السعر عند الطلب».">
          <Input inputMode="decimal" dir="ltr" className="text-right" value={values.price} onChange={event => set("price", event.target.value)} placeholder="مثال: 1250 أو 1250.50" />
        </Field>
        <Field label="الحالة" error={errors.status}>
          <select className="admin-select" value={values.status} onChange={event => set("status", event.target.value as ProductStatus)}>
            {productStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
        </Field>
        <Field label="رابط المنتج" error={errors.slug} hint={productId ? "تغييره يكسر الروابط القديمة لهذا المنتج." : "يُنشأ تلقائياً من العلامة والموديل إذا تُرك فارغاً."}>
          <Input dir="ltr" className="text-right" value={values.slug} onChange={event => set("slug", event.target.value)} placeholder="xerox-versalink-b415" />
        </Field>
        <Field label="ترتيب الظهور" error={errors.sortOrder} hint="الأرقام الأصغر تظهر أولاً.">
          <Input type="number" min={0} value={values.sortOrder} onChange={event => set("sortOrder", Number(event.target.value))} />
        </Field>
        <Field label="لون الأيقونة" error={errors.color} hint="يُستخدم عندما لا توجد صورة.">
          <input type="color" className="h-9 w-20 rounded border border-[#d6e1ef]" value={values.color} onChange={event => set("color", event.target.value)} />
        </Field>
        <label className="flex items-center gap-2 self-center text-sm font-bold"><input type="checkbox" className="size-4" checked={values.featured} onChange={event => set("featured", event.target.checked)} />منتج مختار (يظهر أولاً وفي الصفحة الرئيسية)</label>
      </div>
    </section>

    <div className="admin-actions">
      <Button type="submit" size="lg" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}{productId ? "حفظ التغييرات" : "إضافة المنتج"}</Button>
      {productId && values.status === "published" && initial.status === "published" && <Button asChild variant="outline"><a href={`/product/${initial.slug}`} target="_blank" rel="noreferrer"><ExternalLink />عرض في الموقع</a></Button>}
      {productId && initial.status !== "archived" && <ConfirmAction trigger={<Button type="button" variant="ghost"><Archive />أرشفة</Button>} title="أرشفة المنتج؟" description="سيختفي المنتج من الموقع ويمكن إعادة نشره لاحقاً." confirmLabel="أرشفة" destructive={false} onConfirm={() => remove(false)} />}
      {productId && canHardDelete && <ConfirmAction trigger={<Button type="button" variant="ghost" className="text-red-600"><Trash2 />حذف نهائي</Button>} title="حذف المنتج نهائياً؟" description="سيُحذف المنتج وصورته نهائياً. الطلبات السابقة تحتفظ باسم المنتج." confirmLabel="حذف نهائي" onConfirm={() => remove(true)} />}
    </div>
  </form>;
}
