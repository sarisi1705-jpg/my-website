import { Building2, ChevronLeft, Droplets, Percent, Sparkles, Tag, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSection } from "@/components/contact-section";
import { siteConfig } from "@/lib/site-config";

const offerIcons: Record<string, typeof Droplets> = { ink: Droplets, maintenance: Wrench, business: Building2 };

const extraOffers = [
  { icon: Tag, title: "عروض على طابعات مختارة", description: "أسعار مخفّضة على مجموعة من الطابعات المكتبية والمنزلية لفترة محدودة.", href: "/products" },
  { icon: Percent, title: "خصم عند شراء مجموعة أحبار", description: "وفّر أكثر عند طلب أكثر من عبوة حبر أو تونر في الطلب نفسه.", href: "/products/toners" },
];

export default function OffersPage() {
  return <>
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><Sparkles /> عروض SSPS</span><h1>العروض</h1><p>أحدث عروض المنتجات والصيانة وأسعار الشركات والكميات، محدّثة باستمرار.</p></div></section>

    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading"><div><span>عروض حالية</span><h2>وفّر أكثر مع SSPS</h2></div></div>
      <div className="why-grid">
        {siteConfig.offers.map(offer => { const Icon = offerIcons[offer.icon]; return <article key={offer.title}><Icon /><h3>{offer.title}</h3><p>{offer.description}</p><Button asChild variant="outline" className="mt-3"><a href={offer.href}>{offer.buttonLabel} <ChevronLeft /></a></Button></article>; })}
        {extraOffers.map(offer => <article key={offer.title}><offer.icon /><h3>{offer.title}</h3><p>{offer.description}</p><Button asChild variant="outline" className="mt-3"><a href={offer.href}>تصفّح الآن <ChevronLeft /></a></Button></article>)}
      </div>
    </section>

    <section className="vision-section"><div className="mx-auto grid max-w-[1200px] gap-5 px-4 py-16 sm:px-8 md:grid-cols-2 lg:px-12">
      <article><Building2 /><span>عروض الشركات</span><h2>أسعار خاصة للكميات</h2><p>نقدّم خصومات وشروط توريد مرنة للمؤسسات والشركات حسب حجم الطلب المتكرر.</p><Button asChild className="mt-4 bg-[#1258dc]"><a href="/contact?type=quote">اطلب عرض سعر <ChevronLeft /></a></Button></article>
      <article><Wrench /><span>باقات الصيانة</span><h2>خطط صيانة سنوية</h2><p>باقات دورية تشمل الفحص والصيانة الوقائية لتقليل الأعطال وإطالة عمر الجهاز.</p><Button asChild variant="outline" className="mt-4"><a href="/services">تعرّف على الخدمة <ChevronLeft /></a></Button></article>
    </div></section>

    <ContactSection title="تريد معرفة أحدث العروض أولاً؟" />
  </>;
}
