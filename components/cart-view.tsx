"use client";

import { useState } from "react";
import { ChevronLeft, Loader2, Minus, Plus, RefreshCw, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductMark } from "@/components/product-mark";
import { usePricedCart } from "@/components/use-priced-cart";
import { removeFromCart, setCartQuantity, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { productImageUrl } from "@/lib/images";
import { MAX_LINE_QUANTITY } from "@/lib/order-constants";

export function CartView() {
  const [reloadKey, setReloadKey] = useState(0);
  const stored = useCart();
  const { status, cart } = usePricedCart(reloadKey);

  if (!stored.length) {
    return <div className="cart-empty">
      <ShoppingCart aria-hidden="true" />
      <h2>سلتك فارغة</h2>
      <p>تصفّح المنتجات وأضف ما تحتاجه، ثم أكمل الطلب من هنا.</p>
      <Button asChild className="rounded-xl bg-[#1258dc]"><a href="/products">تصفّح المنتجات <ChevronLeft /></a></Button>
    </div>;
  }

  if (!cart) {
    return status === "error"
      ? <div className="cart-empty" role="alert"><h2>تعذّر تحميل السلة</h2><p>تحقق من اتصالك بالإنترنت ثم أعد المحاولة.</p><Button variant="outline" onClick={() => setReloadKey(key => key + 1)}><RefreshCw />إعادة المحاولة</Button></div>
      : <div className="cart-empty" aria-busy="true"><Loader2 className="animate-spin" aria-hidden="true" /><p>جارٍ تحميل السلة...</p></div>;
  }

  const quantities = new Map(stored.map(line => [line.productId, line.quantity]));
  const price = (minor: number) => formatPrice(minor, cart.currency);

  return <div className="cart-layout" aria-busy={status === "loading"}>
    <ul className="cart-lines">
      {cart.lines.map(line => {
        const quantity = quantities.get(line.productId) ?? line.quantity;
        return <li key={line.productId} className="cart-line">
          <a href={`/product/${line.slug}`} className="cart-line-media" tabIndex={-1} aria-hidden="true">
            <ProductMark iconKey={line.iconKey} color={line.color} brandName={line.brand} imageUrl={productImageUrl(line.imageKey)} alt="" />
          </a>
          <div className="cart-line-info">
            <a href={`/product/${line.slug}`}><strong>{line.name}</strong></a>
            <span dir="ltr">{line.brand} · {line.model}</span>
            <span className="cart-line-unit">سعر القطعة: <b dir="ltr">{price(line.unitPriceMinor)}</b></span>
          </div>
          <div className="cart-line-actions">
            <div className="qty-stepper qty-stepper--small" role="group" aria-label={`كمية ${line.name}`}>
              <button type="button" aria-label="زيادة الكمية" onClick={() => setCartQuantity(line.productId, quantity + 1)} disabled={quantity >= MAX_LINE_QUANTITY}><Plus /></button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" aria-label="إنقاص الكمية" onClick={() => setCartQuantity(line.productId, quantity - 1)} disabled={quantity <= 1}><Minus /></button>
            </div>
            <strong className="cart-line-total" dir="ltr">{price(line.lineTotalMinor)}</strong>
            <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeFromCart(line.productId)}><Trash2 />حذف</Button>
          </div>
        </li>;
      })}
    </ul>

    <aside className="cart-summary">
      <h2>ملخص الطلب</h2>
      <dl>
        <dt>المجموع ({cart.lines.reduce((sum, line) => sum + line.quantity, 0)} قطع)</dt><dd dir="ltr">{price(cart.subtotalMinor)}</dd>
        <dt>التوصيل</dt><dd className="muted">يُحدَّد عند إتمام الطلب</dd>
      </dl>
      <Button asChild size="lg" className="cart-checkout rounded-xl bg-[#1258dc]" aria-disabled={status === "loading"}>
        <a href="/checkout">إتمام الطلب <ChevronLeft /></a>
      </Button>
      <a href="/products" className="cart-continue">متابعة التسوق</a>
      <p className="cart-note">الدفع عند الاستلام أو بتحويل بنكي. سنتصل بك لتأكيد الطلب قبل الشحن.</p>
    </aside>
  </div>;
}
