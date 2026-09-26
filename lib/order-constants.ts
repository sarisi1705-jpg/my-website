// Plain constants shared by the database schema, validation and UI.
// Kept free of imports so client components can use them cheaply.

export const orderStatuses = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;
export const paymentStatuses = ["unpaid", "paid", "refunded"] as const;
export const paymentMethods = ["cod", "bank_transfer"] as const;
export const deliveryZones = ["pickup", "west_bank", "jerusalem", "inside"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type DeliveryZone = (typeof deliveryZones)[number];

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  shipped: "قيد التوصيل",
  delivered: "تم التسليم",
  cancelled: "ملغى",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "غير مدفوع",
  paid: "مدفوع",
  refunded: "مُسترد",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cod: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي",
};

/** Limits for one cart / order. */
export const MAX_CART_LINES = 30;
export const MAX_LINE_QUANTITY = 99;
