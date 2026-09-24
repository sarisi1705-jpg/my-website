import { CheckCircle2, Eye, Flag, Headphones, ShieldCheck, Sparkles, Target } from "lucide-react";
import { ContactSection } from "@/components/contact-section";
import { StatsSection } from "@/components/stats-section";

export default function AboutPage() {
  return <>
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-20 text-center sm:px-8"><span><Sparkles /> تعرّف إلى SSPS</span><h1>من نحن</h1><p>هيكل تعريفي احترافي قابل لتحديث النصوص والصور بما يعكس قصة الشركة وخبرتها الحقيقية.</p></div></section>

    <section className="about-intro mx-auto grid max-w-[1200px] gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:px-12">
      <div><span className="section-kicker">نبذة عن الشركة</span><h2>شريكك في حلول الطباعة</h2><p>تعمل SSPS على تقديم حلول متكاملة للطباعة تشمل الأجهزة والأحبار وقطع الصيانة والمستلزمات، مع التركيز على الجودة وسهولة الوصول إلى الخيار المناسب.</p><p>هذا النص تمهيدي وقابل للاستبدال بقصة الشركة وتاريخ تأسيسها ومجالات عملها والأسواق التي تخدمها.</p></div>
      <div className="about-highlight"><Target /><h3>حلول عملية لأعمال أكثر كفاءة</h3><p>نجمع خيارات الطباعة والدعم في تجربة واضحة تساعد العملاء والأعمال على اتخاذ قرار أفضل.</p></div>
    </section>

    <section className="vision-section"><div className="mx-auto grid max-w-[1200px] gap-5 px-4 py-16 sm:px-8 md:grid-cols-2 lg:px-12">
      <article><Eye /><span>رؤيتنا</span><h2>أن نكون الخيار الموثوق لحلول الطباعة</h2><p>بناء تجربة متكاملة وسهلة تجمع المنتج المناسب بالخدمة التي يحتاجها العميل.</p></article>
      <article><Flag /><span>رسالتنا</span><h2>تقديم قيمة حقيقية في كل حل</h2><p>توفير خيارات موثوقة ودعم متخصص وعلاقة مستمرة تلبي احتياجات الأفراد والمؤسسات.</p></article>
    </div></section>

    <section className="why-section mx-auto max-w-[1200px] px-4 py-16 sm:px-8 lg:px-12"><div className="section-heading"><div><span>لماذا SSPS؟</span><h2>لماذا تختار SSPS</h2></div></div><div className="why-grid">
      <article><CheckCircle2 /><h3>تشكيلة متكاملة</h3><p>طابعات وأحبار وقطع صيانة ومستلزمات في مكان واحد.</p></article>
      <article><ShieldCheck /><h3>خيارات موثوقة</h3><p>حلول مختارة من علامات تجارية معروفة في مجال الطباعة.</p></article>
      <article><Headphones /><h3>دعم متخصص</h3><p>مساعدة واضحة للوصول إلى المنتج والخدمة الأنسب لاحتياجك.</p></article>
    </div></section>

    <StatsSection compact />
    <ContactSection title="ابدأ الحديث معنا اليوم" />
  </>;
}
