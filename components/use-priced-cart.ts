"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { removeFromCart, useCart, type StoredCartLine } from "@/lib/cart";
import type { PricedCart } from "@/lib/server/orders";

export type PricedCartState =
  | { status: "loading"; cart: PricedCart | null }
  | { status: "ready"; cart: PricedCart }
  | { status: "error"; cart: PricedCart | null };

async function fetchPricedCart(items: StoredCartLine[]): Promise<PricedCart> {
  const response = await fetch("/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const payload = (await response.json()) as { data?: PricedCart };
  if (!response.ok || !payload.data) throw new Error(`HTTP ${response.status}`);
  return payload.data;
}

/**
 * The browser's cart priced by the server. Re-prices whenever the cart changes
 * (here or in another tab) or `reloadKey` changes. Products that can no longer
 * be bought are dropped from the stored cart with a notice.
 */
export function usePricedCart(reloadKey = 0): PricedCartState {
  const lines = useCart();
  const linesKey = JSON.stringify(lines);
  const requestKey = `${reloadKey}:${linesKey}`;
  // The last finished request. While it belongs to an older key, a new one is loading.
  const [result, setResult] = useState<{ key: string; ok: boolean; cart: PricedCart | null }>({ key: "", ok: false, cart: null });

  useEffect(() => {
    let cancelled = false;
    fetchPricedCart(JSON.parse(linesKey) as StoredCartLine[])
      .then(cart => {
        if (cancelled) return;
        if (cart.unavailable.length) {
          removeFromCart(cart.unavailable);
          toast.info("أزلنا من السلة منتجات لم تعد متاحة للشراء عبر الموقع.");
        }
        setResult({ key: requestKey, ok: true, cart });
      })
      .catch(error => {
        console.error("[cart]", error);
        if (!cancelled) setResult(previous => ({ key: requestKey, ok: false, cart: previous.cart }));
      });
    return () => {
      cancelled = true;
    };
  }, [linesKey, requestKey]);

  if (result.key !== requestKey) return { status: "loading", cart: result.cart };
  return result.ok && result.cart ? { status: "ready", cart: result.cart } : { status: "error", cart: result.cart };
}
