import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminUsers, products } from "@/db/schema";
import type { Db } from "@/db/types";
import { getOrderDetail, listOrders, orderDashboardStats, updateOrder } from "@/lib/server/admin/orders";
import { HttpError } from "@/lib/server/http";
import { createOrder, getOrder, markOrderNotified, priceCart } from "@/lib/server/orders";
import { formatOrderAlert } from "@/lib/server/telegram";
import { orderListQuery } from "@/lib/validation/admin";
import { checkoutFields } from "@/lib/validation/order";
import { createTestDb } from "./setup";

let db: Db;
let dispose: () => Promise<void>;
let printer: number;
let toner: number;
let onRequest: number;
let draft: number;

const NOW = 1_700_000_000_000;
const meta = { ipHash: "abc", userAgent: "vitest", now: NOW };
const delivery = checkoutFields.parse({ name: "منى سعيد", phone: "0599123456", deliveryZone: "west_bank", city: "رام الله", address: "الماصيون، قرب الدوار", paymentMethod: "cod", notes: "اتصلوا مساءً" });

beforeAll(async () => {
  ({ db, dispose } = await createTestDb());
  const ids = (await db.select({ id: products.id }).from(products).where(eq(products.status, "published")).orderBy(asc(products.id))).map(row => row.id);
  [printer, toner, onRequest, draft] = ids;
  await db.update(products).set({ priceMinor: 125_000 }).where(eq(products.id, printer));
  await db.update(products).set({ priceMinor: 8_950 }).where(eq(products.id, toner));
  await db.update(products).set({ priceMinor: 5_000, status: "draft" }).where(eq(products.id, draft));
});
afterAll(async () => dispose?.());

describe("priceCart", () => {
  it("prices lines from the database and merges repeated products", async () => {
    const cart = await priceCart(db, [{ productId: toner, quantity: 2 }, { productId: printer, quantity: 1 }, { productId: toner, quantity: 1 }]);
    expect(cart.lines.map(line => [line.productId, line.quantity, line.lineTotalMinor])).toEqual([[toner, 3, 26_850], [printer, 1, 125_000]]);
    expect(cart).toMatchObject({ unavailable: [], subtotalMinor: 151_850, currency: "ILS" });
    expect(cart.lines[0]).toMatchObject({ unitPriceMinor: 8_950, name: expect.any(String), brand: expect.any(String), slug: expect.any(String) });
  });

  it("caps merged quantities", async () => {
    const cart = await priceCart(db, [{ productId: toner, quantity: 60 }, { productId: toner, quantity: 60 }]);
    expect(cart.lines[0].quantity).toBe(99);
  });

  it("flags products without a price, hidden products and unknown ids", async () => {
    const cart = await priceCart(db, [{ productId: printer, quantity: 1 }, { productId: onRequest, quantity: 1 }, { productId: draft, quantity: 1 }, { productId: 999_999, quantity: 1 }]);
    expect(cart.lines.map(line => line.productId)).toEqual([printer]);
    expect(cart.unavailable).toEqual([onRequest, draft, 999_999]);
  });
});

describe("createOrder", () => {
  it("stores a snapshot of the lines with delivery and totals", async () => {
    const order = await createOrder(db, delivery, await priceCart(db, [{ productId: toner, quantity: 2 }]), meta);
    expect(order).toMatchObject({
      status: "new", paymentStatus: "unpaid", paymentMethod: "cod", deliveryZone: "west_bank", city: "رام الله",
      subtotalMinor: 17_900, deliveryFeeMinor: 2_000, totalMinor: 19_900, currency: "ILS", customerNotes: "اتصلوا مساءً",
      notifiedAt: null, createdAt: NOW,
    });
    expect(order.items).toEqual([expect.objectContaining({ productId: toner, quantity: 2, unitPriceMinor: 8_950, lineTotalMinor: 17_900 })]);
    // Display-only fields are not stored.
    expect(order.items[0]).not.toHaveProperty("imageKey");
    expect(await getOrder(db, order.id)).toEqual(order);
  });

  it("drops the address and charges nothing for pickup", async () => {
    const pickup = checkoutFields.parse({ ...delivery, deliveryZone: "pickup" });
    const order = await createOrder(db, pickup, await priceCart(db, [{ productId: printer, quantity: 1 }]), meta);
    expect(order).toMatchObject({ city: "", address: "", deliveryFeeMinor: 0, totalMinor: 125_000 });
  });

  it("keeps the order unchanged when the catalog price changes later", async () => {
    const order = await createOrder(db, delivery, await priceCart(db, [{ productId: printer, quantity: 1 }]), meta);
    await db.update(products).set({ priceMinor: 130_000 }).where(eq(products.id, printer));
    expect((await getOrder(db, order.id))?.items[0].unitPriceMinor).toBe(125_000);
    await db.update(products).set({ priceMinor: 125_000 }).where(eq(products.id, printer));
  });

  it("refuses an empty cart", async () => {
    await expect(createOrder(db, delivery, await priceCart(db, []), meta)).rejects.toThrow();
  });

  it("marks an order as notified", async () => {
    const order = await createOrder(db, delivery, await priceCart(db, [{ productId: toner, quantity: 1 }]), meta);
    await markOrderNotified(db, order.id, NOW + 5);
    expect((await getOrder(db, order.id))?.notifiedAt).toBe(NOW + 5);
  });
});

describe("admin orders", () => {
  it("finds orders by reference, phone and status", async () => {
    const order = await createOrder(db, checkoutFields.parse({ ...delivery, name: "عميل البحث", phone: "0597777111" }), await priceCart(db, [{ productId: toner, quantity: 1 }]), meta);
    const search = (params: Record<string, string>) => listOrders(db, orderListQuery.parse(params));
    expect((await search({ q: `ORD-${String(order.id).padStart(6, "0")}` })).items.map(item => item.id)).toEqual([order.id]);
    expect((await search({ q: "7777111" })).items.map(item => item.id)).toEqual([order.id]);
    expect((await search({ q: "عميل البحث" })).total).toBe(1);
    expect((await search({ status: "delivered" })).total).toBe(0);
  });

  it("updates status, payment and assignee, only to staff who can manage orders", async () => {
    const [sales] = await db.insert(adminUsers).values({ email: "sales@ssps.ps", name: "مبيعات", role: "sales", passwordHash: "x", createdAt: NOW, updatedAt: NOW }).returning();
    const [editor] = await db.insert(adminUsers).values({ email: "editor@ssps.ps", name: "محرر", role: "editor", passwordHash: "x", createdAt: NOW, updatedAt: NOW }).returning();
    const order = await createOrder(db, delivery, await priceCart(db, [{ productId: toner, quantity: 1 }]), meta);

    const { before, after } = await updateOrder(db, order.id, { status: "confirmed", paymentStatus: "paid", assignedTo: sales.id }, NOW + 10);
    expect(before.status).toBe("new");
    expect(after).toMatchObject({ status: "confirmed", paymentStatus: "paid", assignedTo: sales.id, assigneeName: "مبيعات", updatedAt: NOW + 10 });

    await expect(updateOrder(db, order.id, { assignedTo: editor.id })).rejects.toBeInstanceOf(HttpError);
    await expect(getOrderDetail(db, 999_999)).rejects.toMatchObject({ status: 404 });
  });

  it("sums recent sales without cancelled orders", async () => {
    const before = await orderDashboardStats(db, NOW + 1000);
    const order = await createOrder(db, delivery, await priceCart(db, [{ productId: printer, quantity: 1 }]), meta);
    expect((await orderDashboardStats(db, NOW + 1000)).revenue30).toBe(before.revenue30 + order.totalMinor);
    await updateOrder(db, order.id, { status: "cancelled" });
    const after = await orderDashboardStats(db, NOW + 1000);
    expect(after.revenue30).toBe(before.revenue30);
    expect(after.byStatus.cancelled).toBe(1);
  });
});

describe("order alert", () => {
  it("lists the customer, lines and totals", async () => {
    const order = await createOrder(db, delivery, await priceCart(db, [{ productId: toner, quantity: 2 }]), meta);
    const text = formatOrderAlert(order, "https://shop.example/");
    expect(text).toContain(`طلب شراء جديد — ORD-${String(order.id).padStart(6, "0")}`);
    expect(text).toContain("الهاتف: 0599123456");
    expect(text).toContain("العنوان: رام الله — الماصيون، قرب الدوار");
    expect(text).toContain("× 2 = ₪179");
    expect(text).toContain("الإجمالي: ₪199");
    expect(text).toContain(`https://shop.example/admin/orders/${order.id}`);
  });
});
