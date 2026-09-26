"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, Loader2, MessageCircle, RefreshCw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { usePricedCart } from "@/components/use-priced-cart";
import { clearCart, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { deliveryZones, paymentMethodLabels, paymentMethods, type DeliveryZone } from "@/lib/order-constants";
import { siteConfig } from "@/lib/site-config";
import { checkoutFields, type CheckoutFields, type CheckoutFieldsInput } from "@/lib/validation/order";

type ApiResponse = {
  data?: { id: number; reference: string; totalMinor: number };
  error?: { code: string; message: string; fieldErrors?: Record<string, string> };
};

const { deliveryZones: zoneOptions, paymentMethods: paymentNotes } = siteConfig.store;

export function CheckoutForm({ siteKey, whatsappHref }: { siteKey: string; whatsappHref: string }) {
  const [reloadKey, setReloadKey] = useState(0);
  const stored = useCart();
  const { status, cart } = usePricedCart(reloadKey);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [placed, setPlaced] = useState<{ reference: string; totalMinor: number } | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const form = useForm<CheckoutFieldsInput, unknown, CheckoutFields>({
    resolver: zodResolver(checkoutFields),
    defaultValues: { name: "", phone: "", email: "", deliveryZone: "west_bank", city: "", address: "", paymentMethod: "cod", notes: "" },
  });
  const zone = (useWatch({ control: form.control, name: "deliveryZone" }) ?? "west_bank") as DeliveryZone;
  const submitting = form.formState.isSubmitting;

  // The page collapses into a short confirmation, so bring it into view (and focus for screen readers).
  useEffect(() => {
    if (!placed) return;
    successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    successRef.current?.focus({ preventScroll: true });
  }, [placed]);

  if (placed) {
    const followUp = `${whatsappHref}?text=${encodeURIComponent(`مرحباً، أرسلت طلب شراء عبر الموقع برقم ${placed.reference}`)}`;
    return <div className="inquiry-card inquiry-success" role="status" ref={successRef} tabIndex={-1}>
      <CheckCircle2 aria-hidden="true" />
      <h2>شكراً لك، تم استلام طلبك</h2>
      <p>رقم الطلب: <strong dir="ltr">{placed.reference}</strong></p>
      <p>الإجمالي: <strong dir="ltr">{formatPrice(placed.totalMinor, cart?.currency ?? "ILS")}</strong></p>
      <p>سيتصل بك فريق SSPS لتأكيد الطلب وموعد التسليم خلال ساعات العمل.</p>
      <div className="inquiry-success-actions">
        <Button asChild variant="outline"><a href={followUp} target="_blank" rel="noreferrer"><MessageCircle />متابعة عبر WhatsApp</a></Button>
        <Button asChild variant="ghost"><a href="/products">متابعة التسوق</a></Button>
      </div>
    </div>;
  }

  if (!stored.length) {
    return <div className="cart-empty">
      <ShoppingBag aria-hidden="true" />
      <h2>سلتك فارغة</h2>
      <p>أضف منتجات إلى السلة أولاً، ثم أكمل الطلب.</p>
      <Button asChild className="rounded-xl bg-[#1258dc]"><a href="/products">تصفّح المنتجات <ChevronLeft /></a></Button>
    </div>;
  }

  if (!cart) {
    return status === "error"
      ? <div className="cart-empty" role="alert"><h2>تعذّر تحميل السلة</h2><Button variant="outline" onClick={() => setReloadKey(key => key + 1)}><RefreshCw />إعادة المحاولة</Button></div>
      : <div className="cart-empty" aria-busy="true"><Loader2 className="animate-spin" aria-hidden="true" /><p>جارٍ تحميل الطلب...</p></div>;
  }

  const price = (minor: number) => formatPrice(minor, cart.currency);
  const fee = zoneOptions[zone].feeMinor;
  const total = cart.subtotalMinor + fee;
  const pickup = zone === "pickup";

  async function onSubmit(fields: CheckoutFields) {
    if (!turnstileToken) {
      toast.error("يرجى انتظار اكتمال التحقق الأمني ثم الإرسال.");
      return;
    }
    if (status !== "ready") {
      toast.error("يتم تحديث السلة، حاول بعد لحظة.");
      return;
    }
    let result: ApiResponse = {};
    let httpStatus = 0;
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields, items: stored, expectedTotalMinor: total, turnstileToken, website: honeypot }),
      });
      httpStatus = response.status;
      result = (await response.json()) as ApiResponse;
    } catch {
      toast.error("تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.");
      return;
    } finally {
      // A Turnstile token is single-use, so every attempt needs a new one.
      setTurnstileReset(value => value + 1);
    }

    if (result.data) {
      clearCart();
      setPlaced({ reference: result.data.reference, totalMinor: result.data.totalMinor });
      return;
    }
    if (result.error?.code === "cart_changed" || result.error?.code === "price_changed") setReloadKey(key => key + 1);
    for (const [field, message] of Object.entries(result.error?.fieldErrors ?? {})) {
      form.setError(field as keyof CheckoutFieldsInput, { message });
    }
    toast.error(result.error?.message ?? `حدث خطأ غير متوقع (${httpStatus}). يرجى المحاولة لاحقاً.`);
  }

  return <Form {...form}>
    <form className="checkout-layout" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="checkout-main">
        <section className="inquiry-card checkout-section">
          <h2>بيانات التواصل</h2>
          <div className="inquiry-grid">
            <FormField control={form.control} name="name" render={({ field }) => <FormItem>
              <FormLabel>الاسم الكامل *</FormLabel>
              <FormControl><Input autoComplete="name" placeholder="مثال: أحمد خليل" {...field} value={String(field.value ?? "")} /></FormControl>
              <FormMessage />
            </FormItem>} />
            <FormField control={form.control} name="phone" render={({ field }) => <FormItem>
              <FormLabel>رقم الهاتف *</FormLabel>
              <FormControl><Input type="tel" inputMode="tel" dir="ltr" className="text-right" autoComplete="tel" placeholder="059 000 0000" {...field} value={String(field.value ?? "")} /></FormControl>
              <FormMessage />
            </FormItem>} />
            <FormField control={form.control} name="email" render={({ field }) => <FormItem className="sm:col-span-2">
              <FormLabel>البريد الإلكتروني</FormLabel>
              <FormControl><Input type="email" dir="ltr" className="text-right" autoComplete="email" placeholder="اختياري" {...field} value={String(field.value ?? "")} /></FormControl>
              <FormMessage />
            </FormItem>} />
          </div>
        </section>

        <section className="inquiry-card checkout-section">
          <h2>الاستلام والتوصيل</h2>
          <FormField control={form.control} name="deliveryZone" render={({ field }) => <FormItem>
            <FormLabel className="sr-only">طريقة الاستلام</FormLabel>
            <div className="choice-grid" role="radiogroup" aria-label="طريقة الاستلام">
              {deliveryZones.map(option => <button key={option} type="button" role="radio" aria-checked={field.value === option} className="choice-card" onClick={() => field.onChange(option)}>
                <strong>{zoneOptions[option].label}</strong>
                <span dir="ltr">{zoneOptions[option].feeMinor ? price(zoneOptions[option].feeMinor) : "مجاناً"}</span>
                <small>{zoneOptions[option].note}</small>
              </button>)}
            </div>
            <FormMessage />
          </FormItem>} />
          {!pickup && <div className="inquiry-grid mt-4">
            <FormField control={form.control} name="city" render={({ field }) => <FormItem>
              <FormLabel>المدينة أو البلدة *</FormLabel>
              <FormControl><Input autoComplete="address-level2" placeholder="مثال: رام الله" {...field} value={String(field.value ?? "")} /></FormControl>
              <FormMessage />
            </FormItem>} />
            <FormField control={form.control} name="address" render={({ field }) => <FormItem>
              <FormLabel>العنوان *</FormLabel>
              <FormControl><Input autoComplete="street-address" placeholder="الحي، الشارع، أقرب معلم" {...field} value={String(field.value ?? "")} /></FormControl>
              <FormMessage />
            </FormItem>} />
          </div>}
        </section>

        <section className="inquiry-card checkout-section">
          <h2>طريقة الدفع</h2>
          <FormField control={form.control} name="paymentMethod" render={({ field }) => <FormItem>
            <FormLabel className="sr-only">طريقة الدفع</FormLabel>
            <div className="choice-grid choice-grid--two" role="radiogroup" aria-label="طريقة الدفع">
              {paymentMethods.map(option => <button key={option} type="button" role="radio" aria-checked={field.value === option} className="choice-card" onClick={() => field.onChange(option)}>
                <strong>{paymentMethodLabels[option]}</strong>
                <small>{paymentNotes[option]}</small>
              </button>)}
            </div>
            <FormMessage />
          </FormItem>} />
          <FormField control={form.control} name="notes" render={({ field }) => <FormItem className="mt-4">
            <FormLabel>ملاحظات على الطلب</FormLabel>
            <FormControl><Textarea rows={3} placeholder="اختياري: وقت مناسب للتواصل، تفاصيل الفاتورة..." {...field} value={String(field.value ?? "")} /></FormControl>
            <FormMessage />
          </FormItem>} />
        </section>
      </div>

      <aside className="cart-summary checkout-summary">
        <h2>طلبك</h2>
        <ul className="checkout-lines">
          {cart.lines.map(line => <li key={line.productId}>
            <span>{line.name} <b dir="ltr">× {line.quantity}</b></span>
            <span dir="ltr">{price(line.lineTotalMinor)}</span>
          </li>)}
        </ul>
        <dl>
          <dt>المجموع</dt><dd dir="ltr">{price(cart.subtotalMinor)}</dd>
          <dt>التوصيل</dt><dd dir="ltr">{fee ? price(fee) : "مجاناً"}</dd>
          <dt className="cart-summary-total">الإجمالي</dt><dd className="cart-summary-total" dir="ltr">{price(total)}</dd>
        </dl>

        {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
        <div className="inquiry-honeypot" aria-hidden="true">
          <label>الموقع الإلكتروني<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} name="website" /></label>
        </div>
        <TurnstileWidget siteKey={siteKey} onToken={setTurnstileToken} resetKey={turnstileReset} />

        <Button type="submit" size="lg" className="cart-checkout rounded-xl bg-[#1258dc]" disabled={submitting || status !== "ready"}>
          {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          {submitting ? "جارٍ إرسال الطلب..." : "تأكيد الطلب"}
        </Button>
        <a href="/cart" className="cart-continue">تعديل السلة</a>
        <p className="cart-note">لا يُطلب أي دفع الآن. نستخدم بياناتك فقط لتنفيذ طلبك.</p>
      </aside>
    </form>
  </Form>;
}
