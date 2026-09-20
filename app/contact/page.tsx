import { Clock3, Mail, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site-config";

export default function ContactPage() {
  const { contact } = siteConfig;
  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader active="contact" />
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-20 text-center sm:px-8"><span><Sparkles /> نحن هنا للمساعدة</span><h1>تواصل معنا</h1><p>للاستفسار عن المنتجات أو الصيانة أو أسعار الكميات، اختر وسيلة التواصل الأنسب لك.</p></div></section>

    <section className="contact-page mx-auto max-w-[1100px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="contact-page-grid">
        <article><span><Phone /></span><h2>اتصل بنا</h2><a href={contact.phoneHref}>{contact.phone}</a><p>للاستفسارات المباشرة وطلبات المنتجات.</p></article>
        <article><span><MessageCircle /></span><h2>WhatsApp</h2><a href={contact.whatsappHref} target="_blank" rel="noreferrer">{contact.whatsapp}</a><p>أرسل تفاصيل طلبك وسنتابع معك.</p></article>
        <article><span><Mail /></span><h2>البريد الإلكتروني</h2><a href={`mailto:${contact.email}`}>{contact.email}</a><p>للعروض والمراسلات الرسمية.</p></article>
        <article><span><MapPin /></span><h2>العنوان</h2><p>{contact.address}</p><small><Clock3 />أضف ساعات العمل الفعلية هنا لاحقًا.</small></article>
      </div>
      <div className="contact-page-actions"><Button asChild size="lg"><a href={contact.phoneHref}><Phone />اتصل الآن</a></Button><Button asChild variant="outline" size="lg"><a href={contact.whatsappHref} target="_blank" rel="noreferrer"><MessageCircle />تواصل عبر WhatsApp</a></Button></div>
    </section>
    <SiteFooter />
  </main>;
}
