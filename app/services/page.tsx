import { CalendarClock, ChevronLeft, ClipboardCheck, Headphones, PackageCheck, PhoneCall, Settings2, ShieldCheck, Sparkles, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSection } from "@/components/contact-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatsSection } from "@/components/stats-section";

const services = [
  { icon: Wrench, title: "تركيب وإعداد الأجهزة", description: "تركيب الطابعات وربطها بالشبكة وضبط إعدادات الطباعة لأول استخدام." },
  { icon: CalendarClock, title: "عقود صيانة دورية", description: "خطط صيانة منتظمة تقلّل من أعطال الطابعات وتحافظ على جودة الطباعة." },
  { icon: Settings2, title: "إصلاح وصيانة عاجلة", description: "تشخيص الأعطال واستبدال القطع اللازمة لإعادة الجهاز للعمل بسرعة." },
  { icon: Truck, title: "توريد المستلزمات للشركات", description: "تزويد دوري بالأحبار والتونر والورق حسب حجم استهلاك عملك." },
  { icon: Headphones, title: "دعم فني عن بُعد", description: "مساعدة سريعة عبر الهاتف أو واتساب لحل المشكلات الشائعة دون انتظار." },
  { icon: ClipboardCheck, title: "استشارات حلول الطباعة", description: "اقتراح الجهاز والحل الأنسب لحجم عملك واحتياجاتك الفعلية." },
];

const steps = [
  { title: "تواصل معنا", description: "أخبرنا عن نوع الجهاز أو المشكلة عبر الهاتف أو واتساب أو نموذج التواصل." },
  { title: "تحديد الحل", description: "نقترح خطة الصيانة أو الخدمة المناسبة ونتفق على الموعد والتفاصيل." },
  { title: "التنفيذ والمتابعة", description: "ننفذ الخدمة في موقعك أو لدينا، ونتابع معك للتأكد من استمرار الأداء الجيد." },
];

export default function ServicesPage() {
  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader active="services" />
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><Sparkles /> خدمات SSPS</span><h1>خدماتنا</h1><p>دعم متكامل للطباعة يشمل التركيب والصيانة الدورية والطارئة وتوريد المستلزمات والاستشارة الفنية.</p></div></section>

    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading"><div><span>ماذا نقدّم</span><h2>خدمات الدعم والصيانة</h2></div></div>
      <div className="why-grid">{services.map(service => <article key={service.title}><service.icon /><h3>{service.title}</h3><p>{service.description}</p></article>)}</div>
    </section>

    <section className="vision-section"><div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading"><div><span>كيف تبدأ</span><h2>خطوات طلب الخدمة</h2></div></div>
      <div className="why-grid">{steps.map((step, index) => <article key={step.title}><span className="section-kicker">{`خطوة ${index + 1}`}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
      <div className="mx-auto mt-8 flex max-w-[1200px] justify-center"><Button asChild size="lg"><a href="/contact?type=service"><PhoneCall />اطلب الخدمة الآن <ChevronLeft /></a></Button></div>
    </div></section>

    <section className="service-strip"><div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:grid-cols-3 sm:px-8 lg:px-12"><div><PackageCheck /><span><strong>فريق مختص</strong><small>تعامل مباشر مع فنيين لديهم خبرة في مختلف العلامات التجارية</small></span></div><div><ShieldCheck /><span><strong>قطع موثوقة</strong><small>قطع صيانة أصلية أو متوافقة حسب حاجة الجهاز</small></span></div><div><Headphones /><span><strong>متابعة مستمرة</strong><small>تواصل بعد الخدمة للتأكد من استقرار الأداء</small></span></div></div></section>
    <StatsSection compact />
    <ContactSection title="بحاجة إلى خدمة صيانة أو دعم؟" />
    <SiteFooter />
  </main>;
}
