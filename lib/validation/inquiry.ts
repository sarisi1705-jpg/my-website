import { z } from "zod";
import { contactMethods, inquiryTypes } from "@/lib/inquiry-constants";
import { collapseWhitespace, toLatinDigits } from "@/lib/text";

export const inquiryTypeLabels: Record<(typeof inquiryTypes)[number], string> = {
  quote: "طلب عرض سعر",
  service: "طلب خدمة أو صيانة",
  contact: "استفسار عام",
};

export const contactMethodLabels: Record<(typeof contactMethods)[number], string> = {
  phone: "اتصال هاتفي",
  whatsapp: "واتساب",
  email: "البريد الإلكتروني",
};

/**
 * Keeps a leading "+" and digits only; accepts Arabic-Indic digits and the
 * spaces, dashes, dots and brackets people type in phone numbers.
 */
export function normalizePhone(value: string): string {
  const latin = toLatinDigits(value).trim();
  const digits = latin.replace(/\D/g, "");
  return latin.startsWith("+") ? `+${digits}` : digits;
}

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number, message: string) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, message).optional());

const optionalPositiveInt = (max: number, message: string) =>
  z.preprocess(
    value => {
      const cleaned = emptyToUndefined(typeof value === "string" ? toLatinDigits(value) : value);
      return cleaned === undefined ? undefined : Number(cleaned);
    },
    z.number({ invalid_type_error: message }).int(message).min(1, message).max(max, message).optional(),
  );

/** Fields a visitor fills in. Shared by the form (client) and the API (server). */
export const inquiryFields = z
  .object({
    type: z.enum(inquiryTypes, { errorMap: () => ({ message: "نوع الطلب غير صالح" }) }),
    name: z
      .string({ required_error: "الاسم مطلوب" })
      .transform(collapseWhitespace)
      .pipe(z.string().min(2, "يرجى كتابة الاسم (حرفان على الأقل)").max(100, "الاسم طويل جداً")),
    phone: z
      .string({ required_error: "رقم الهاتف مطلوب" })
      .transform(normalizePhone)
      .pipe(
        z
          .string()
          .regex(/^\+?\d{7,15}$/, "يرجى كتابة رقم هاتف صحيح")
      ),
    email: z.preprocess(
      emptyToUndefined,
      z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح").max(200).optional(),
    ),
    company: optionalText(150, "اسم الشركة طويل جداً"),
    preferredContact: z.enum(contactMethods).default("phone"),
    productId: optionalPositiveInt(1_000_000_000, "المنتج غير صالح"),
    quantity: optionalPositiveInt(100_000, "الكمية يجب أن تكون رقماً بين 1 و 100000"),
    message: z.preprocess(
      value => (value == null ? "" : value),
      z.string().trim().max(2000, "الرسالة طويلة جداً (2000 حرف كحد أقصى)"),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "quote" && data.message.length < 5) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "يرجى كتابة تفاصيل طلبك (5 أحرف على الأقل)" });
    }
    if (data.preferredContact === "email" && !data.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "أدخل بريدك الإلكتروني لنتواصل معك عبره" });
    }
  });

export type InquiryFieldsInput = z.input<typeof inquiryFields>;
export type InquiryFields = z.output<typeof inquiryFields>;

/** What the API accepts: the visitor's fields plus anti-spam and context. */
export const inquiryRequest = z.object({
  fields: inquiryFields,
  turnstileToken: z.string().max(4096).default(""),
  // Honeypot: hidden from people, so any value means a bot.
  website: z.string().max(500).optional(),
  sourcePath: z.string().max(300).optional(),
});

export type InquiryRequest = z.input<typeof inquiryRequest>;

export function formatInquiryReference(id: number): string {
  return `SSPS-${String(id).padStart(6, "0")}`;
}
