"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MessageCircle, PackageCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { contactMethods, inquiryTypes, type InquiryType } from "@/lib/inquiry-constants";
import { contactMethodLabels, inquiryFields, inquiryTypeLabels, type InquiryFields, type InquiryFieldsInput } from "@/lib/validation/inquiry";

export type InquiryProduct = { id: number; name: string; brand: string; model: string };

type ApiResponse = {
  data?: { id: number; reference: string };
  error?: { code: string; message: string; fieldErrors?: Record<string, string> };
};

const messagePlaceholders: Record<InquiryType, string> = {
  quote: "اذكر المنتجات أو الموديلات والكميات المطلوبة (اختياري)",
  service: "صف المشكلة أو الخدمة المطلوبة، ونوع الجهاز إن أمكن",
  contact: "اكتب استفسارك هنا",
};

export function InquiryForm({ siteKey, whatsappHref, defaultType = "quote", product }: {
  siteKey: string;
  whatsappHref: string;
  defaultType?: InquiryType;
  product?: InquiryProduct;
}) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // The form collapses into a short message, so bring it into view (and focus for screen readers).
  useEffect(() => {
    if (!reference) return;
    successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    successRef.current?.focus({ preventScroll: true });
  }, [reference]);

  const form = useForm<InquiryFieldsInput, unknown, InquiryFields>({
    resolver: zodResolver(inquiryFields),
    defaultValues: {
      type: defaultType,
      name: "",
      phone: "",
      email: "",
      company: "",
      preferredContact: "whatsapp",
      productId: product?.id,
      quantity: "",
      message: "",
    },
  });

  const type = useWatch({ control: form.control, name: "type" }) as InquiryType;
  const submitting = form.formState.isSubmitting;

  async function onSubmit(fields: InquiryFields) {
    if (!turnstileToken) {
      toast.error("يرجى انتظار اكتمال التحقق الأمني ثم الإرسال.");
      return;
    }
    let result: ApiResponse = {};
    let status = 0;
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields, turnstileToken, website: honeypot, sourcePath: window.location.pathname }),
      });
      status = response.status;
      result = (await response.json()) as ApiResponse;
    } catch {
      toast.error("تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.");
      return;
    } finally {
      // A Turnstile token is single-use, so every attempt needs a new one.
      setTurnstileReset(value => value + 1);
    }

    if (result.data) {
      setReference(result.data.reference);
      form.reset();
      return;
    }
    for (const [field, message] of Object.entries(result.error?.fieldErrors ?? {})) {
      form.setError(field as keyof InquiryFieldsInput, { message });
    }
    toast.error(result.error?.message ?? `حدث خطأ غير متوقع (${status}). يرجى المحاولة لاحقاً.`);
  }

  if (reference) {
    const followUp = `${whatsappHref}?text=${encodeURIComponent(`مرحباً، أرسلت طلباً عبر الموقع برقم ${reference}`)}`;
    return <div className="inquiry-success" role="status" ref={successRef} tabIndex={-1}>
      <CheckCircle2 aria-hidden="true" />
      <h3>تم استلام طلبك بنجاح</h3>
      <p>رقم الطلب: <strong dir="ltr">{reference}</strong></p>
      <p>سيتواصل معك فريق SSPS في أقرب وقت خلال ساعات العمل.</p>
      <div className="inquiry-success-actions">
        <Button asChild variant="outline"><a href={followUp} target="_blank" rel="noreferrer"><MessageCircle />متابعة عبر WhatsApp</a></Button>
        <Button type="button" variant="ghost" onClick={() => setReference(null)}>إرسال طلب آخر</Button>
      </div>
    </div>;
  }

  return <Form {...form}>
    <form className="inquiry-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FormField control={form.control} name="type" render={({ field }) => <FormItem>
        <FormLabel>نوع الطلب</FormLabel>
        <div className="inquiry-types" role="radiogroup" aria-label="نوع الطلب">
          {inquiryTypes.map(option => <button key={option} type="button" role="radio" aria-checked={field.value === option} className="inquiry-type" onClick={() => field.onChange(option)}>{inquiryTypeLabels[option]}</button>)}
        </div>
      </FormItem>} />

      {product && <div className="inquiry-product"><PackageCheck aria-hidden="true" /><span><small>المنتج المطلوب</small><strong>{product.name}</strong><span dir="ltr">{product.brand} · {product.model}</span></span></div>}

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
        <FormField control={form.control} name="preferredContact" render={({ field }) => <FormItem>
          <FormLabel>طريقة التواصل المفضلة</FormLabel>
          <FormControl><select className="inquiry-select" {...field} value={String(field.value ?? "whatsapp")}>
            {contactMethods.map(method => <option key={method} value={method}>{contactMethodLabels[method]}</option>)}
          </select></FormControl>
          <FormMessage />
        </FormItem>} />
        <FormField control={form.control} name="email" render={({ field }) => <FormItem>
          <FormLabel>البريد الإلكتروني</FormLabel>
          <FormControl><Input type="email" dir="ltr" className="text-right" autoComplete="email" placeholder="name@example.com" {...field} value={String(field.value ?? "")} /></FormControl>
          <FormMessage />
        </FormItem>} />
        <FormField control={form.control} name="company" render={({ field }) => <FormItem>
          <FormLabel>الشركة أو المؤسسة</FormLabel>
          <FormControl><Input autoComplete="organization" placeholder="اختياري" {...field} value={String(field.value ?? "")} /></FormControl>
          <FormMessage />
        </FormItem>} />
        {type === "quote" && <FormField control={form.control} name="quantity" render={({ field }) => <FormItem>
          <FormLabel>الكمية</FormLabel>
          <FormControl><Input inputMode="numeric" placeholder="اختياري" {...field} value={String(field.value ?? "")} /></FormControl>
          <FormMessage />
        </FormItem>} />}
      </div>

      <FormField control={form.control} name="message" render={({ field }) => <FormItem>
        <FormLabel>{type === "quote" ? "تفاصيل إضافية" : "تفاصيل الطلب *"}</FormLabel>
        <FormControl><Textarea rows={5} placeholder={messagePlaceholders[type]} {...field} value={String(field.value ?? "")} /></FormControl>
        <FormMessage />
      </FormItem>} />

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div className="inquiry-honeypot" aria-hidden="true">
        <label>الموقع الإلكتروني<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} name="website" /></label>
      </div>

      <TurnstileWidget siteKey={siteKey} onToken={setTurnstileToken} resetKey={turnstileReset} />

      <Button type="submit" size="lg" className="inquiry-submit" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <Send />}
        {submitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
      </Button>
      <p className="inquiry-note">نستخدم بياناتك فقط للرد على طلبك.</p>
    </form>
  </Form>;
}
