import { describe, expect, it } from "vitest";
import { isPurchasable } from "@/lib/catalog-constants";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "@/lib/order-constants";
import { checkoutFields, formatOrderReference, orderRequest } from "@/lib/validation/order";

const base = { name: " منى  سعيد ", phone: "٠٥٩٩-١٢٣-٤٥٦", deliveryZone: "west_bank", city: "رام الله", address: "الماصيون، قرب الدوار", paymentMethod: "cod" };

function errors(input: unknown) {
  const result = checkoutFields.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map(issue => [issue.path.join("."), issue.message]));
}

describe("checkout fields", () => {
  it("normalizes name and phone and defaults notes", () => {
    expect(checkoutFields.parse(base)).toEqual({
      name: "منى سعيد", phone: "0599123456", email: undefined, deliveryZone: "west_bank",
      city: "رام الله", address: "الماصيون، قرب الدوار", paymentMethod: "cod", notes: "",
    });
  });

  it("requires a city and address for delivery", () => {
    expect(errors({ ...base, city: "", address: "  " })).toMatchObject({ city: expect.any(String), address: expect.any(String) });
  });

  it("needs no address for pickup", () => {
    expect(checkoutFields.safeParse({ ...base, deliveryZone: "pickup", city: "", address: "" }).success).toBe(true);
  });

  it("rejects unknown delivery zones and payment methods", () => {
    expect(errors({ ...base, deliveryZone: "moon", paymentMethod: "crypto" })).toMatchObject({ deliveryZone: "اختر طريقة الاستلام", paymentMethod: "اختر طريقة الدفع" });
  });

  it("validates email only when given", () => {
    expect(errors({ ...base, email: "" })).toEqual({});
    expect(errors({ ...base, email: "nope" })).toHaveProperty("email");
  });
});

describe("order request", () => {
  const request = { fields: base, items: [{ productId: 1, quantity: 2 }], expectedTotalMinor: 1000, turnstileToken: "t" };

  it("accepts a valid order", () => {
    expect(orderRequest.safeParse(request).success).toBe(true);
  });

  it("rejects an empty cart, bad quantities and oversized carts", () => {
    expect(orderRequest.safeParse({ ...request, items: [] }).success).toBe(false);
    expect(orderRequest.safeParse({ ...request, items: [{ productId: 1, quantity: 0 }] }).success).toBe(false);
    expect(orderRequest.safeParse({ ...request, items: [{ productId: 1, quantity: MAX_LINE_QUANTITY + 1 }] }).success).toBe(false);
    expect(orderRequest.safeParse({ ...request, items: [{ productId: 1.5, quantity: 1 }] }).success).toBe(false);
    const tooMany = Array.from({ length: MAX_CART_LINES + 1 }, (_, index) => ({ productId: index + 1, quantity: 1 }));
    expect(orderRequest.safeParse({ ...request, items: tooMany }).success).toBe(false);
  });

  it("formats order references", () => {
    expect(formatOrderReference(42)).toBe("ORD-000042");
  });
});

describe("isPurchasable", () => {
  it("needs a price in the store currency", () => {
    expect(isPurchasable({ priceMinor: 1500, currency: "ILS" })).toBe(true);
    expect(isPurchasable({ priceMinor: 0, currency: "ILS" })).toBe(true);
    expect(isPurchasable({ priceMinor: null, currency: "ILS" })).toBe(false);
    expect(isPurchasable({ priceMinor: 1500, currency: "USD" })).toBe(false);
  });
});
