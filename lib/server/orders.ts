import { eq } from "drizzle-orm";
import { orders, type Order, type OrderItem } from "@/db/schema";
import type { Db } from "@/db/types";
import { DEFAULT_CURRENCY, isPurchasable, type IconKey } from "@/lib/catalog-constants";
import { MAX_LINE_QUANTITY, type DeliveryZone } from "@/lib/order-constants";
import { getPublishedProductsByIds } from "@/lib/server/catalog";
import { siteConfig } from "@/lib/site-config";
import type { CartLine, CheckoutFields } from "@/lib/validation/order";

/** A cart line priced from the database, with what the cart page needs to show it. */
export type PricedLine = OrderItem & { imageKey: string | null; color: string; iconKey: IconKey };

export type PricedCart = {
  lines: PricedLine[];
  /** Requested products that can't be bought online (hidden, deleted, or price on request). */
  unavailable: number[];
  subtotalMinor: number;
  currency: string;
};

/** Merges repeated products, keeping the order they were first added in. */
function mergeLines(items: CartLine[]): Map<number, number> {
  const merged = new Map<number, number>();
  for (const { productId, quantity } of items) {
    merged.set(productId, Math.min((merged.get(productId) ?? 0) + quantity, MAX_LINE_QUANTITY));
  }
  return merged;
}

/**
 * Prices a cart from the current catalog. The browser only sends ids and
 * quantities, so prices can't be tampered with. Only published products with
 * a price in the store currency can be bought online.
 */
export async function priceCart(db: Db, items: CartLine[]): Promise<PricedCart> {
  const wanted = mergeLines(items);
  const found = new Map((await getPublishedProductsByIds(db, [...wanted.keys()])).map(product => [product.id, product]));
  const lines: PricedLine[] = [];
  const unavailable: number[] = [];

  for (const [productId, quantity] of wanted) {
    const product = found.get(productId);
    if (!product || product.priceMinor === null || !isPurchasable(product)) {
      unavailable.push(productId);
      continue;
    }
    lines.push({
      productId,
      slug: product.slug,
      name: product.name,
      brand: product.brand.name,
      model: product.model,
      unitPriceMinor: product.priceMinor,
      quantity,
      lineTotalMinor: product.priceMinor * quantity,
      imageKey: product.imageKey,
      color: product.color,
      iconKey: product.category.iconKey,
    });
  }

  return { lines, unavailable, subtotalMinor: lines.reduce((sum, line) => sum + line.lineTotalMinor, 0), currency: DEFAULT_CURRENCY };
}

export function deliveryFeeMinor(zone: DeliveryZone): number {
  return siteConfig.store.deliveryZones[zone].feeMinor;
}

export type OrderMeta = {
  ipHash: string | null;
  userAgent: string | null;
  now?: number;
};

/** Saves an order from a priced cart. One INSERT, so it is either fully stored or not at all. */
export async function createOrder(db: Db, fields: CheckoutFields, cart: PricedCart, meta: OrderMeta): Promise<Order> {
  if (!cart.lines.length) throw new Error("createOrder needs at least one line");
  const now = meta.now ?? Date.now();
  const fee = deliveryFeeMinor(fields.deliveryZone);
  const pickup = fields.deliveryZone === "pickup";
  const [row] = await db
    .insert(orders)
    .values({
      paymentMethod: fields.paymentMethod,
      name: fields.name,
      phone: fields.phone,
      email: fields.email ?? null,
      deliveryZone: fields.deliveryZone,
      // A pickup has no delivery address, even if the form had one filled in before switching.
      city: pickup ? "" : fields.city,
      address: pickup ? "" : fields.address,
      customerNotes: fields.notes,
      items: cart.lines.map(({ productId, slug, name, brand, model, unitPriceMinor, quantity, lineTotalMinor }) =>
        ({ productId, slug, name, brand, model, unitPriceMinor, quantity, lineTotalMinor })),
      subtotalMinor: cart.subtotalMinor,
      deliveryFeeMinor: fee,
      totalMinor: cart.subtotalMinor + fee,
      currency: cart.currency,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return row;
}

export async function markOrderNotified(db: Db, id: number, now = Date.now()): Promise<void> {
  await db.update(orders).set({ notifiedAt: now }).where(eq(orders.id, id));
}

export async function getOrder(db: Db, id: number): Promise<Order | undefined> {
  return db.select().from(orders).where(eq(orders.id, id)).get();
}
