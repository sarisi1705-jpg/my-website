"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, Grid2X2, Headphones, PackageCheck, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ContactSection } from "@/components/contact-section";
import { HeroCarousel } from "@/components/hero-carousel";
import { OffersPanel } from "@/components/offers-panel";
import { ProductMark } from "@/components/product-mark";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatsSection } from "@/components/stats-section";
import { brands, categories, products, type Product } from "@/data/products";

export default function Home() {
  const [query, setQuery] = useState(""); const [brand, setBrand] = useState("الكل"); const [category, setCategory] = useState("الكل"); const [selected, setSelected] = useState<Product | null>(null);
  const filtered = useMemo(() => { const needle = query.trim().toLowerCase(); return products.filter(p => { const text = `${p.name} ${p.model} ${p.brand}`.toLowerCase(); return (!needle || text.includes(needle)) && (brand === "الكل" || p.brand === brand) && (category === "الكل" || p.category === category) }) }, [query, brand, category]);
  const reset = () => { setQuery(""); setBrand("الكل"); setCategory("الكل") };
  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader />
    <StatsSection />

    <section id="top" className="hero-grid overflow-hidden"><div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-20"><div className="flex flex-col justify-center">
      <span className="eyebrow"><Sparkles /> حلول متكاملة لمكان عمل أكثر كفاءة</span><h1>حلول الطباعة<br /><span>تبدأ من هنا.</span></h1><p className="hero-copy">اكتشف مجموعة مختارة من الطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة من علامات موثوقة.</p>
      <div className="hero-search" role="search"><Search aria-hidden="true" /><Input aria-label="ابحث عن منتج" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم، الموديل أو العلامة التجارية..." /><Button asChild><a href={query ? `/products?q=${encodeURIComponent(query)}` : "/products"}>بحث</a></Button></div>
      <div className="trust-row"><span><PackageCheck /> منتجات مختارة</span><span><ShieldCheck /> جودة موثوقة</span><span><Headphones /> دعم متخصص</span></div>
    </div><HeroCarousel /></div></section>

    <div className="discovery-layout mx-auto max-w-[1440px] px-4 py-14 sm:px-8 lg:px-12"><section id="categories"><div className="section-heading"><div><span>تصفّح بسهولة</span><h2>الأقسام الرئيسية</h2></div><a href="/products">عرض جميع المنتجات <ChevronLeft /></a></div><div className="category-grid">{categories.map(({ name, icon: Icon, note }) => <a key={name} href={`/products?category=${encodeURIComponent(name)}`} className="category-card"><span><Icon /></span><div><strong>{name}</strong><small>{note}</small></div><ChevronLeft /></a>)}</div></section><OffersPanel /></div>

    <section id="catalog" className="catalog-section"><div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12"><div className="section-heading catalog-heading"><div><span>كتالوج SSPS</span><h2>منتجات مختارة</h2></div><p>بيانات تجريبية قابلة للاستبدال لاحقاً بمنتجاتك الحقيقية.</p></div>
      <div className="filter-bar"><label className="filter-search"><Search /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث داخل الكتالوج..." /></label><Select value={category} onValueChange={setCategory}><SelectTrigger className="filter-select"><Grid2X2 /><SelectValue /></SelectTrigger><SelectContent>{["الكل", ...categories.map(c => c.name)].map(item => <SelectItem key={item} value={item}>{item === "الكل" ? "كل التصنيفات" : item}</SelectItem>)}</SelectContent></Select><Select value={brand} onValueChange={setBrand}><SelectTrigger className="filter-select"><SelectValue /></SelectTrigger><SelectContent>{brands.map(item => <SelectItem key={item} value={item}>{item === "الكل" ? "كل العلامات" : item}</SelectItem>)}</SelectContent></Select>{(query || brand !== "الكل" || category !== "الكل") && <Button variant="ghost" onClick={reset}>مسح الفلاتر <X /></Button>}<span className="results-count">{filtered.length} منتج</span></div>
      {filtered.length ? <div className="products-grid">{filtered.map(product => <article className="product-card" key={product.id}><div className="product-art"><span className="brand-chip">{product.brand}</span>{product.featured && <span className="featured-chip">مختار</span>}<ProductMark product={product} /></div><div className="product-body"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p className="model">{product.model}</p><p>{product.description}</p><Button variant="outline" onClick={() => setSelected(product)}>عرض التفاصيل <ChevronLeft /></Button></div></article>)}</div> : <div className="empty-state"><Search /><h3>لم نجد نتائج مطابقة</h3><p>جرّب كلمة أخرى أو امسح الفلاتر الحالية.</p><Button onClick={reset}>عرض كل المنتجات</Button></div>}
    </div></section>

    <section id="services" className="service-strip"><div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:grid-cols-3 sm:px-8 lg:px-12"><div><PackageCheck /><span><strong>تشكيلة متكاملة</strong><small>كل مستلزمات الطباعة في كتالوج واحد</small></span></div><div><ShieldCheck /><span><strong>خيارات موثوقة</strong><small>علامات تجارية معروفة وحلول عملية</small></span></div><div><Headphones /><span><strong>مساعدة متخصصة</strong><small>اختيار المنتج الأنسب لاحتياجك</small></span></div></div></section>
    <ContactSection />
    <SiteFooter />

    <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}><SheetContent side="left" className="w-full overflow-y-auto border-[#dbe5f3] p-0 sm:max-w-[520px]" dir="rtl">{selected && <><SheetHeader className="border-b border-[#e2eaf5] p-6 text-right"><SheetDescription>{selected.category} · {selected.brand}</SheetDescription><SheetTitle className="text-2xl text-[#10213d]">{selected.name}</SheetTitle></SheetHeader><div className="p-6"><ProductMark product={selected} large /><p className="detail-model">{selected.model}</p><p className="detail-copy">{selected.description}</p><h3 className="detail-title">المواصفات الأساسية</h3><ul className="spec-list">{selected.specs.map(spec => <li key={spec}><PackageCheck />{spec}</li>)}</ul><div className="detail-note"><ShieldCheck /><span><strong>منتج تجريبي</strong><small>يمكن استبدال البيانات والصورة والمواصفات لاحقاً بسهولة.</small></span></div><div className="mt-6 grid gap-2"><Button asChild className="w-full rounded-xl bg-[#1258dc]"><a href={`/contact?type=quote&product=${selected.id}#inquiry`}>اطلب عرض سعر لهذا المنتج <ChevronLeft /></a></Button><Button variant="outline" className="w-full rounded-xl" onClick={() => setSelected(null)}>العودة إلى الكتالوج</Button></div></div></>}</SheetContent></Sheet>
  </main>;
}
