"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "@/lib/order-constants";

function add(productId: number, name: string, quantity: number) {
  const result = addToCart(productId, quantity);
  if (result === "added") {
    toast.success(`أُضيف ${name} إلى السلة`, { action: { label: "عرض السلة", onClick: () => { window.location.href = "/cart"; } } });
  } else if (result === "full") {
    toast.error(`لا يمكن إضافة أكثر من ${MAX_CART_LINES} منتجاً مختلفاً للسلة.`);
  } else {
    toast.error("تعذّر حفظ السلة في هذا المتصفح. تحقق من إعدادات الخصوصية أو اطلب عبر WhatsApp.");
  }
}

/** Quantity picker plus "add to cart", for the product page. */
export function AddToCart({ productId, name }: { productId: number; name: string }) {
  const [quantity, setQuantity] = useState(1);
  return <div className="add-to-cart">
    <div className="qty-stepper" role="group" aria-label="الكمية">
      <button type="button" aria-label="زيادة الكمية" onClick={() => setQuantity(value => Math.min(value + 1, MAX_LINE_QUANTITY))} disabled={quantity >= MAX_LINE_QUANTITY}><Plus /></button>
      <output aria-live="polite">{quantity}</output>
      <button type="button" aria-label="إنقاص الكمية" onClick={() => setQuantity(value => Math.max(value - 1, 1))} disabled={quantity <= 1}><Minus /></button>
    </div>
    <Button type="button" size="lg" className="rounded-xl bg-[#1258dc]" onClick={() => add(productId, name, quantity)}><ShoppingCart />أضف إلى السلة</Button>
  </div>;
}

/** Compact button for product cards. */
export function AddToCartButton({ productId, name }: { productId: number; name: string }) {
  return <Button type="button" className="card-add-to-cart" onClick={() => add(productId, name, 1)} aria-label={`أضف ${name} إلى السلة`}>
    <ShoppingCart />أضف للسلة
  </Button>;
}
