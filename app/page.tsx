"use client";

import { useMemo, useState } from "react";
import { Box, ChevronLeft, CircleGauge, Droplets, Grid2X2, Headphones, PackageCheck, Printer, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ContactSection } from "@/components/contact-section";
import { HeroCarousel } from "@/components/hero-carousel";
import { OffersPanel } from "@/components/offers-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatsSection } from "@/components/stats-section";

type Category = "طابعات" | "أحبار وتونر" | "قطع وصيانة" | "ورق وطباعة";
type Product = { id: number; name: string; model: string; brand: string; category: Category; description: string; color: string; specs: string[]; featured?: boolean };

const products: Product[] = [
  { id: 1, name: "طابعة ليزر مكتبية", model: "VersaLink B415", brand: "Xerox", category: "طابعات", description: "طابعة أحادية اللون سريعة ومناسبة لمجموعات العمل.", color: "#2563eb", specs: ["طباعة ليزر", "اتصال شبكي", "طباعة على الوجهين"], featured: true },
  { id: 2, name: "طابعة EcoTank ملونة", model: "L6290", brand: "Epson", category: "طابعات", description: "حل اقتصادي للطباعة اليومية بخزانات حبر قابلة لإعادة التعبئة.", color: "#0891b2", specs: ["ألوان", "Wi‑Fi", "ماسح ضوئي"], featured: true },
  { id: 3, name: "طابعة ليزر متعددة الوظائف", model: "LaserJet Pro 4103fdw", brand: "HP", category: "طابعات", description: "طباعة ومسح ونسخ للمكاتب ذات ضغط العمل المتوسط.", color: "#4f46e5", specs: ["متعددة الوظائف", "Wi‑Fi", "تغذية تلقائية"] },
  { id: 4, name: "طابعة صور احترافية", model: "imagePROGRAF PRO-300", brand: "Canon", category: "طابعات", description: "دقة ألوان عالية للمصورين والاستوديوهات.", color: "#7c3aed", specs: ["طباعة صور", "A3+", "اتصال لاسلكي"] },
  { id: 5, name: "تونر أسود عالي السعة", model: "006R04731", brand: "Xerox", category: "أحبار وتونر", description: "خرطوشة تونر للاستخدام المكتبي المكثف.", color: "#1e3a8a", specs: ["أسود", "سعة عالية", "عبوة واحدة"], featured: true },
  { id: 6, name: "عبوة حبر أسود", model: "T7741", brand: "Epson", category: "أحبار وتونر", description: "عبوة حبر أصلية لأنظمة EcoTank المتوافقة.", color: "#0f766e", specs: ["أسود", "70 مل", "EcoTank"] },
  { id: 7, name: "تونر LaserJet سماوي", model: "W2031A", brand: "HP", category: "أحبار وتونر", description: "لون ثابت ونتائج واضحة للمستندات والعروض.", color: "#0284c7", specs: ["سماوي", "ليزر", "خرطوشة أصلية"] },
  { id: 8, name: "حبر PIXMA متعدد الألوان", model: "GI-490 C/M/Y", brand: "Canon", category: "أحبار وتونر", description: "طقم عبوات ملونة للطباعة المنزلية والمكتبية.", color: "#db2777", specs: ["3 ألوان", "Inkjet", "طقم اقتصادي"] },
  { id: 9, name: "وحدة تصوير", model: "013R00691", brand: "Xerox", category: "قطع وصيانة", description: "وحدة تصوير بديلة للحفاظ على جودة الطباعة.", color: "#475569", specs: ["قطعة صيانة", "عمر طويل", "تركيب سهل"] },
  { id: 10, name: "رول تغذية ورق", model: "RM2-5392", brand: "HP", category: "قطع وصيانة", description: "قطعة تغذية بديلة لمجموعة من طابعات LaserJet.", color: "#64748b", specs: ["قطعة بديلة", "مطاط مقوّى", "لدرج الورق"] },
  { id: 11, name: "صندوق صيانة", model: "T04D1", brand: "Epson", category: "قطع وصيانة", description: "وحدة تجميع حبر فائض سهلة الاستبدال.", color: "#334155", specs: ["صندوق صيانة", "تركيب مباشر", "Inkjet"] },
  { id: 12, name: "رأس طباعة", model: "PF-06", brand: "Canon", category: "قطع وصيانة", description: "رأس طباعة دقيق لطابعات التنسيق الكبير.", color: "#374151", specs: ["دقة عالية", "Large format", "قطعة أصلية"] },
  { id: 13, name: "ورق تصوير يومي", model: "A4 — 80 gsm", brand: "Navigator", category: "ورق وطباعة", description: "ورق أبيض ناعم للطباعة والنسخ اليومي.", color: "#f59e0b", specs: ["A4", "80 gsm", "500 ورقة"] },
  { id: 14, name: "ورق صور لامع", model: "A4 — 200 gsm", brand: "Epson", category: "ورق وطباعة", description: "سطح لامع للصور والعروض عالية الجودة.", color: "#ea580c", specs: ["لامع", "A4", "20 ورقة"] },
  { id: 15, name: "ملصقات ذاتية اللصق", model: "A4 Labels", brand: "Avery", category: "ورق وطباعة", description: "صفائح ملصقات متعددة الاستخدامات للطابعات المكتبية.", color: "#d97706", specs: ["ذاتي اللصق", "A4", "قص مسبق"] },
  { id: 16, name: "ورق رول للبلوتر", model: "A0 — 90 gsm", brand: "Canon", category: "ورق وطباعة", description: "رول ورق للمخططات والرسومات الهندسية.", color: "#ca8a04", specs: ["A0", "90 gsm", "طول 50 متر"] },
];

const categories: { name: Category; icon: typeof Printer; note: string }[] = [
  { name: "طابعات", icon: Printer, note: "4 منتجات" }, { name: "أحبار وتونر", icon: Droplets, note: "4 منتجات" }, { name: "قطع وصيانة", icon: CircleGauge, note: "4 منتجات" }, { name: "ورق وطباعة", icon: Box, note: "4 منتجات" },
];
const brands = ["الكل", "Xerox", "Epson", "HP", "Canon", "Navigator", "Avery"];

function ProductMark({ product, large = false }: { product: Product; large?: boolean }) {
  const Icon = product.category === "طابعات" ? Printer : product.category === "أحبار وتونر" ? Droplets : product.category === "قطع وصيانة" ? CircleGauge : Box;
  return <div className={large ? "product-mark product-mark--large" : "product-mark"} style={{ "--product-color": product.color } as React.CSSProperties}><span className="product-orbit" /><Icon aria-hidden="true" strokeWidth={1.55} /><span className="product-code">{product.brand.slice(0, 2).toUpperCase()}</span></div>;
}

export default function Home() {
  const [query, setQuery] = useState(""); const [brand, setBrand] = useState("الكل"); const [category, setCategory] = useState("الكل"); const [selected, setSelected] = useState<Product | null>(null);
  const filtered = useMemo(() => { const needle = query.trim().toLowerCase(); return products.filter(p => { const text = `${p.name} ${p.model} ${p.brand}`.toLowerCase(); return (!needle || text.includes(needle)) && (brand === "الكل" || p.brand === brand) && (category === "الكل" || p.category === category) }) }, [query, brand, category]);
  const reset = () => { setQuery(""); setBrand("الكل"); setCategory("الكل") };
  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader />
    <StatsSection />

    <section id="top" className="hero-grid overflow-hidden"><div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-20"><div className="flex flex-col justify-center">
      <span className="eyebrow"><Sparkles /> حلول متكاملة لمكان عمل أكثر كفاءة</span><h1>حلول الطباعة<br /><span>تبدأ من هنا.</span></h1><p className="hero-copy">اكتشف مجموعة مختارة من الطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة من علامات موثوقة.</p>
      <div className="hero-search" role="search"><Search aria-hidden="true" /><Input aria-label="ابحث عن منتج" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم، الموديل أو العلامة التجارية..." /><Button asChild><a target="_top" href={query ? `/products?q=${encodeURIComponent(query)}` : "/products"}>بحث</a></Button></div>
      <div className="trust-row"><span><PackageCheck /> منتجات مختارة</span><span><ShieldCheck /> جودة موثوقة</span><span><Headphones /> دعم متخصص</span></div>
    </div><HeroCarousel /></div></section>

    <div className="discovery-layout mx-auto max-w-[1440px] px-4 py-14 sm:px-8 lg:px-12"><section id="categories"><div className="section-heading"><div><span>تصفّح بسهولة</span><h2>الأقسام الرئيسية</h2></div><a target="_top" href="/products">عرض جميع المنتجات <ChevronLeft /></a></div><div className="category-grid">{categories.map(({ name, icon: Icon, note }) => <a target="_top" key={name} href={`/products?category=${encodeURIComponent(name)}`} className="category-card"><span><Icon /></span><div><strong>{name}</strong><small>{note}</small></div><ChevronLeft /></a>)}</div></section><OffersPanel /></div>

    <section id="catalog" className="catalog-section"><div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12"><div className="section-heading catalog-heading"><div><span>كتالوج SSPS</span><h2>منتجات مختارة</h2></div><p>بيانات تجريبية قابلة للاستبدال لاحقاً بمنتجاتك الحقيقية.</p></div>
      <div className="filter-bar"><label className="filter-search"><Search /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث داخل الكتالوج..." /></label><Select value={category} onValueChange={setCategory}><SelectTrigger className="filter-select"><Grid2X2 /><SelectValue /></SelectTrigger><SelectContent>{["الكل", ...categories.map(c => c.name)].map(item => <SelectItem key={item} value={item}>{item === "الكل" ? "كل التصنيفات" : item}</SelectItem>)}</SelectContent></Select><Select value={brand} onValueChange={setBrand}><SelectTrigger className="filter-select"><SelectValue /></SelectTrigger><SelectContent>{brands.map(item => <SelectItem key={item} value={item}>{item === "الكل" ? "كل العلامات" : item}</SelectItem>)}</SelectContent></Select>{(query || brand !== "الكل" || category !== "الكل") && <Button variant="ghost" onClick={reset}>مسح الفلاتر <X /></Button>}<span className="results-count">{filtered.length} منتج</span></div>
      {filtered.length ? <div className="products-grid">{filtered.map(product => <article className="product-card" key={product.id}><div className="product-art"><span className="brand-chip">{product.brand}</span>{product.featured && <span className="featured-chip">مختار</span>}<ProductMark product={product} /></div><div className="product-body"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p className="model">{product.model}</p><p>{product.description}</p><Button variant="outline" onClick={() => setSelected(product)}>عرض التفاصيل <ChevronLeft /></Button></div></article>)}</div> : <div className="empty-state"><Search /><h3>لم نجد نتائج مطابقة</h3><p>جرّب كلمة أخرى أو امسح الفلاتر الحالية.</p><Button onClick={reset}>عرض كل المنتجات</Button></div>}
    </div></section>

    <section id="services" className="service-strip"><div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:grid-cols-3 sm:px-8 lg:px-12"><div><PackageCheck /><span><strong>تشكيلة متكاملة</strong><small>كل مستلزمات الطباعة في كتالوج واحد</small></span></div><div><ShieldCheck /><span><strong>خيارات موثوقة</strong><small>علامات تجارية معروفة وحلول عملية</small></span></div><div><Headphones /><span><strong>مساعدة متخصصة</strong><small>اختيار المنتج الأنسب لاحتياجك</small></span></div></div></section>
    <ContactSection />
    <SiteFooter />

    <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}><SheetContent side="left" className="w-full overflow-y-auto border-[#dbe5f3] p-0 sm:max-w-[520px]" dir="rtl">{selected && <><SheetHeader className="border-b border-[#e2eaf5] p-6 text-right"><SheetDescription>{selected.category} · {selected.brand}</SheetDescription><SheetTitle className="text-2xl text-[#10213d]">{selected.name}</SheetTitle></SheetHeader><div className="p-6"><ProductMark product={selected} large /><p className="detail-model">{selected.model}</p><p className="detail-copy">{selected.description}</p><h3 className="detail-title">المواصفات الأساسية</h3><ul className="spec-list">{selected.specs.map(spec => <li key={spec}><PackageCheck />{spec}</li>)}</ul><div className="detail-note"><ShieldCheck /><span><strong>منتج تجريبي</strong><small>يمكن استبدال البيانات والصورة والمواصفات لاحقاً بسهولة.</small></span></div><Button className="mt-6 w-full rounded-xl bg-[#1258dc]" onClick={() => setSelected(null)}>العودة إلى الكتالوج</Button></div></>}</SheetContent></Sheet>
  </main>;
}
