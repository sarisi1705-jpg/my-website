import { z } from "zod";
import { deliveryZones, MAX_CART_LINES, MAX_LINE_QUANTITY, paymentMethods } from "@/lib/order-constants";
import { collapseWhitespace } from "@/lib/text";
import { normalizePhone } from "@/lib/validation/inquiry";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const textField = (max: number, message: string) =>
  z.preprocess(value => (value == null ? "" : value), z.string().trim().max(max, message));

/** What the shopper fills in at checkout. Shared by the form (client) and the API (server). */
export const checkoutFields = z
  .object({
    name: z
      .string({ required_error: "الاسم مطلوب" })
      .transform(collapseWhitespace)
      .pipe(z.string().min(2, "يرجى كتابة الاسم (حرفان على الأقل)").max(100, "الاسم طويل جداً")),
    phone: z
      .string({ required_error: "رقم الهاتف مطلوب" })
      .transform(normalizePhone)
      .pipe(z.string().regex(/^\+?\d{7,15}$/, "يرجى كتابة رقم هاتف صحيح")),
    email: z.preprocess(
      emptyToUndefined,
      z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح").max(200).optional(),
    ),
    deliveryZone: z.enum(deliveryZones, { errorMap: () => ({ message: "اختر طريقة الاستلام" }) }),
    city: textField(80, "اسم المدينة طويل جداً"),
    address: textField(300, "العنوان طويل جداً"),
    paymentMethod: z.enum(paymentMethods, { errorMap: () => ({ message: "اختر طريقة الدفع" }) }),
    notes: textField(1000, "الملاحظات طويلة جداً (1000 حرف كحد أقصى)"),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryZone === "pickup") return;
    if (data.city.length < 2) ctx.addIssue({ code: "custom", path: ["city"], message: "اكتب المدينة أو البلدة" });
    if (data.address.length < 5) ctx.addIssue({ code: "custom", path: ["address"], message: "اكتب عنوان التوصيل (الحي والشارع وأقرب معلم)" });
  });

export type CheckoutFieldsInput = z.input<typeof checkoutFields>;
export type CheckoutFields = z.output<typeof checkoutFields>;

export const cartLine = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export const cartLines = z
  .array(cartLine)
  .max(MAX_CART_LINES, `لا يمكن أن تحتوي السلة على أكثر من ${MAX_CART_LINES} منتجاً`);

export type CartLine = z.output<typeof cartLine>;

/** POST /api/cart: the browser's cart, to be priced from the database. */
export const cartRequest = z.object({ items: cartLines });

/** POST /api/orders: checkout fields, the cart, and anti-spam fields. */
export const orderRequest = z.object({
  fields: checkoutFields,
  items: cartLines.min(1, "السلة فارغة"),
  // The total the shopper saw. If prices changed since, the order is refused so they can review it.
  expectedTotalMinor: z.number().int().nonnegative(),
  turnstileToken: z.string().max(4096).default(""),
  // Honeypot: hidden from people, so any value means a bot.
  website: z.string().max(500).optional(),
});

export type OrderRequest = z.input<typeof orderRequest>;

export function formatOrderReference(id: number): string {
  return `ORD-${String(id).padStart(6, "0")}`;
}
