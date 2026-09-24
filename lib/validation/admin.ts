import { z } from "zod";
import { adminRoles } from "@/lib/auth/roles";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { iconKeys, productStatuses } from "@/lib/catalog-constants";
import { inquiryStatuses, inquiryTypes } from "@/lib/inquiry-constants";
import { SLUG_PATTERN } from "@/lib/slug";
import { collapseWhitespace, toLatinDigits } from "@/lib/text";

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const text = (min: number, max: number, label: string) =>
  z.string({ required_error: `${label} مطلوب` }).transform(collapseWhitespace)
    .pipe(z.string().min(min, min <= 1 ? `${label} مطلوب` : `${label} قصير جداً`).max(max, `${label} طويل جداً`));
const longText = (max: number, label: string) =>
  z.preprocess(value => (value == null ? "" : value), z.string().trim().max(max, `${label} طويل جداً`));
const slug = z.string().trim().toLowerCase().max(80, "الرابط طويل جداً").regex(SLUG_PATTERN, "الرابط يقبل أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط");
const id = (label: string) => z.coerce.number({ invalid_type_error: `${label} غير صالح` }).int().positive(`اختر ${label}`);
const password = z.string().min(MIN_PASSWORD_LENGTH, `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`).max(200, "كلمة المرور طويلة جداً");

// ── Auth and accounts ──────────────────────────────────────────────────────

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح").max(200),
  password: z.string().min(1, "كلمة المرور مطلوبة").max(200),
});

export const passwordChangeInput = z
  .object({ currentPassword: z.string().min(1, "أدخل كلمة المرور الحالية").max(200), newPassword: password })
  .refine(data => data.currentPassword !== data.newPassword, { path: ["newPassword"], message: "اختر كلمة مرور مختلفة عن الحالية" });

export const userCreateInput = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح").max(200),
  name: text(2, 100, "الاسم"),
  role: z.enum(adminRoles, { errorMap: () => ({ message: "اختر الصلاحية" }) }),
  // Blank: a temporary password is generated and shown once.
  password: z.preprocess(emptyToUndefined, password.optional()),
});

export const userUpdateInput = z
  .object({
    name: text(2, 100, "الاسم").optional(),
    role: z.enum(adminRoles).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: "لا توجد تغييرات" });

export const passwordResetInput = z.object({ password: z.preprocess(emptyToUndefined, password.optional()) });

// ── Catalog ────────────────────────────────────────────────────────────────

const MAX_PRICE_MINOR = 1_000_000_000; // ₪10,000,000

/** "1,250.50", "١٢٥٠", 1250 or "" → minor units (agorot) or null for "price on request". */
export const priceInput = z.preprocess(value => {
  if (value === null || value === undefined) return null;
  const cleaned = toLatinDigits(String(value)).replace(/[,\s₪]/g, "").replace("٫", ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned) * 100);
}, z.number({ invalid_type_error: "السعر يجب أن يكون رقماً (مثال: 1250 أو 1250.50)" }).int().min(0).max(MAX_PRICE_MINOR, "السعر كبير جداً").nullable());

export const productInput = z.object({
  name: text(2, 200, "اسم المنتج"),
  model: longText(100, "الموديل"),
  slug: z.preprocess(emptyToUndefined, slug.optional()),
  brandId: id("العلامة التجارية"),
  categoryId: id("التصنيف"),
  description: longText(2000, "الوصف"),
  specs: z.array(z.string().transform(collapseWhitespace).pipe(z.string().max(120, "المواصفة طويلة جداً")))
    .max(20, "20 مواصفة كحد أقصى")
    .transform(list => list.filter(Boolean))
    .default([]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "اللون غير صالح").default("#1258dc"),
  imageKey: z.preprocess(emptyToUndefined, z.string().regex(/^products\/[a-z0-9-]+\.(jpg|png|webp)$/, "الصورة غير صالحة").nullable().optional()).transform(value => value ?? null),
  price: priceInput.default(null),
  featured: z.boolean().default(false),
  status: z.enum(productStatuses).default("draft"),
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
});
export type ProductInput = z.output<typeof productInput>;

export const categoryInput = z.object({
  slug,
  name: text(2, 100, "اسم التصنيف"),
  description: longText(300, "الوصف"),
  iconKey: z.enum(iconKeys).default("package"),
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.output<typeof categoryInput>;

export const brandInput = z.object({
  slug: z.preprocess(emptyToUndefined, slug.optional()),
  name: text(1, 100, "اسم العلامة"),
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
});
export type BrandInput = z.output<typeof brandInput>;

// ── Inquiries ──────────────────────────────────────────────────────────────

export const inquiryUpdateInput = z
  .object({
    status: z.enum(inquiryStatuses).optional(),
    assignedTo: z.number().int().positive().nullable().optional(),
    internalNotes: z.string().max(5000, "الملاحظات طويلة جداً").optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: "لا توجد تغييرات" });

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(value => (values.includes(firstValue(value) as string) ? firstValue(value) : undefined), z.enum(values).optional());
const pageParam = z.preprocess(value => {
  const parsed = Number.parseInt(String(firstValue(value) ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 10_000) : 1;
}, z.number());
const dateParam = z.preprocess(value => {
  const first = firstValue(value);
  return typeof first === "string" && /^\d{4}-\d{2}-\d{2}$/.test(first) ? first : undefined;
}, z.string().optional());
const searchParam = z.preprocess(value => {
  const first = firstValue(value);
  return typeof first === "string" && first.trim() ? first.trim().slice(0, 100) : undefined;
}, z.string().optional());

export const inquiryListQuery = z.object({
  status: optionalEnum(inquiryStatuses),
  type: optionalEnum(inquiryTypes),
  q: searchParam,
  from: dateParam,
  to: dateParam,
  assigned: z.preprocess(value => {
    const first = firstValue(value);
    return first === "me" || first === "none" || (typeof first === "string" && /^\d+$/.test(first)) ? first : undefined;
  }, z.string().optional()),
  page: pageParam,
});
export type InquiryListQuery = z.output<typeof inquiryListQuery>;

export const adminProductListQuery = z.object({
  q: searchParam,
  status: optionalEnum(productStatuses),
  category: searchParam,
  page: pageParam,
});
export type AdminProductListQuery = z.output<typeof adminProductListQuery>;

export const pageQuery = z.object({ page: pageParam });

export function toRecord(params: URLSearchParams | Record<string, unknown>): Record<string, unknown> {
  return params instanceof URLSearchParams ? Object.fromEntries(params.entries()) : params;
}
