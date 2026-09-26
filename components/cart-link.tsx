"use client";

import { ShoppingCart } from "lucide-react";
import { useCartCount } from "@/lib/cart";

export function CartLink({ active = false }: { active?: boolean }) {
  const count = useCartCount();
  const label = count ? `السلة (${count} ${count === 1 ? "قطعة" : "قطع"})` : "السلة فارغة";
  return <a href="/cart" className={`cart-link${active ? " cart-link--active" : ""}`} aria-label={label} aria-current={active ? "page" : undefined}>
    <ShoppingCart aria-hidden="true" />
    {count > 0 && <span className="cart-link-count" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
  </a>;
}
