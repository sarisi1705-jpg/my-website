import { env } from "cloudflare:workers";
import { Clock3, Mail, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import { InquiryForm, type InquiryProduct } from "@/components/inquiry-form";
import { getDb } from "@/db";
import { getPublishedProductById } from "@/lib/server/catalog";
import { inquiryTypes, type InquiryType } from "@/lib/inquiry-constants";
import { siteConfig } from "@/lib/site-config";

const formHeadings: Record<InquiryType, { title: string; copy: string }> = {
  quote: { title: "اطلب عرض سعر", copy: "أرسل تفاصيل المنتجات والكميات، وسنرد عليك بعرض سعر مناسب." },
  service: { title: "اطلب خدمة أو صيانة", copy: "صف المشكلة أو الخدمة المطلوبة، وسيتواصل معك فريق الدعم الفني." },
  contact: { title: "أرسل لنا رسالة", copy: "اكتب استفسارك وسنرد عليك في أقرب وقت." },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { contact } = siteConfig;
  const params = await searchParams;
  const requestedType = first(params.type);
  const type: InquiryType = inquiryTypes.includes(requestedType as InquiryType) ? (requestedType as InquiryType) : "quote";
  const productId = Number(first(params.product));
  const match = Number.isInteger(productId) && productId > 0 ? await getPublishedProductById(getDb(), productId) : undefined;
  const product: InquiryProduct | undefined = match && { id: match.id, name: match.name, brand: match.brand.name, model: match.model };
  const heading = formHeadings[type];

  return <>
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-20 text-center sm:px-8"><span><Sparkles /> نحن هنا للمساعدة</span><h1>تواصل معنا</h1><p>للاستفسار عن المنتجات أو الصيانة أو أسعار الكميات، أرسل طلبك عبر النموذج أو اختر وسيلة التواصل الأنسب لك.</p></div></section>

    <section className="contact-page mx-auto grid max-w-[1200px] gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:px-12">
      <div className="inquiry-card" id="inquiry">
        <h2>{heading.title}</h2>
        <p>{heading.copy}</p>
        <InquiryForm siteKey={env.TURNSTILE_SITE_KEY} whatsappHref={contact.whatsappHref} defaultType={type} product={product} />
      </div>
      <div className="contact-page-grid contact-page-grid--stacked">
        <article><span><Phone /></span><h2>اتصل بنا</h2><a href={contact.phoneHref}>{contact.phone}</a><p>للاستفسارات المباشرة وطلبات المنتجات.</p></article>
        <article><span><MessageCircle /></span><h2>WhatsApp</h2><a href={contact.whatsappHref} target="_blank" rel="noreferrer">{contact.whatsapp}</a><p>أرسل تفاصيل طلبك وسنتابع معك.</p></article>
        <article><span><Mail /></span><h2>البريد الإلكتروني</h2><a href={`mailto:${contact.email}`}>{contact.email}</a><p>للعروض والمراسلات الرسمية.</p></article>
        <article><span><MapPin /></span><h2>العنوان</h2><p>{contact.address}</p><small><Clock3 />أضف ساعات العمل الفعلية هنا لاحقًا.</small></article>
      </div>
    </section>
  </>;
}
