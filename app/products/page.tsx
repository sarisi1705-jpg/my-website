"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Grid2X2, PackageCheck, PackageSearch, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ContactSection } from "@/components/contact-section";
import { ProductMark } from "@/components/product-mark";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brands, categories, products, type Product } from "@/data/products";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [brand, setBrand] = useState("الكل");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "الكل");
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter(p => {
      const text = `${p.name} ${p.model} ${p.brand}`.toLowerCase();
      return (!needle || text.includes(needle)) && (brand === "الكل" || p.brand === brand) && (category === "الكل" || p.category === category);
    });
  }, [query, brand, category]);

  const reset = () => { setQuery(""); setBrand("الكل"); setCategory("الكل"); };

  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader active="products" />
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><PackageSearch /> كتالوج SSPS</span><h1>المنتجات</h1><p>تصفّح كتالوج الطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة، وابحث أو صفِّ النتائج حسب حاجتك.</p></div></section>

    <section className="catalog-section"><div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading catalog-heading"><div><span>تصفّح الكتالوج</span><h2>كل المنتجات</h2></div><p>بيانات تجريبية قابلة للاستبدال لاحقاً بمنتجاتك الحقيقية.</p></div>

      <div className="category-grid" style={{ marginBottom: "1.5rem" }}>
        {categories.map(({ name, icon: Icon, note }) => <button type="button" key={name} onClick={() => setCategory(current => current === name ? "الكل" : name)} className="category-card" aria-pressed={category === name} style={category === name ? { borderColor: "#1258dc", boxShadow: "0 18px 35px #254e8824" } : undefined}>
          <span><Icon /></span><div><strong>{name}</strong><small>{note}</small></div><ChevronLeft />
        </button>)}
      </div>

      <div className="filter-bar"><label className="filter-search"><Search /><Input aria-label="ابحث داخل الكتالوج" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم، الموديل أو العلامة التجارية..." /></label><Select value={category} onValueChange={setCategory}><SelectTrigger className="filter-select"><Grid2X2 /><SelectValue /></SelectTrigger><SelectContent>{["الكل", ...categories.map(c => c.name)].map(item => <SelectItem key={item} value={item}>{item === "الكل" ? "كل التصنيفات" : item}</SelectItem>)}</SelectContent></Select><Select value={brand} onValueChange={setBrand}><SelectTrigger className="filter-select"><SelectValue /></SelectTrigger><SelectContent>{brands.map(item => <SelectItem key={item} value={item}>{item === "الكل" ? "كل العلامات" : item}</SelectItem>)}</SelectContent></Select>{(query || brand !== "الكل" || category !== "الكل") && <Button variant="ghost" onClick={reset}>مسح الفلاتر <X /></Button>}<span className="results-count">{filtered.length} منتج</span></div>

      {filtered.length ? <div className="products-grid">{filtered.map(product => <article className="product-card" key={product.id}><div className="product-art"><span className="brand-chip">{product.brand}</span>{product.featured && <span className="featured-chip">مختار</span>}<ProductMark product={product} /></div><div className="product-body"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p className="model">{product.model}</p><p>{product.description}</p><Button variant="outline" onClick={() => setSelected(product)}>عرض التفاصيل <ChevronLeft /></Button></div></article>)}</div> : <div className="empty-state"><Search /><h3>لم نجد نتائج مطابقة</h3><p>جرّب كلمة أخرى أو امسح الفلاتر الحالية.</p><Button onClick={reset}>عرض كل المنتجات</Button></div>}
    </div></section>

    <section className="service-strip"><div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:grid-cols-3 sm:px-8 lg:px-12"><div><PackageCheck /><span><strong>تشكيلة متكاملة</strong><small>كل مستلزمات الطباعة في كتالوج واحد</small></span></div><div><ShieldCheck /><span><strong>خيارات موثوقة</strong><small>علامات تجارية معروفة وحلول عملية</small></span></div><div><Sparkles /><span><strong>تحديث مستمر</strong><small>الكتالوج قابل للتوسيع بمنتجات جديدة باستمرار</small></span></div></div></section>
    <ContactSection title="لم تجد ما تبحث عنه؟" />
    <SiteFooter />

    <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}><SheetContent side="left" className="w-full overflow-y-auto border-[#dbe5f3] p-0 sm:max-w-[520px]" dir="rtl">{selected && <><SheetHeader className="border-b border-[#e2eaf5] p-6 text-right"><SheetDescription>{selected.category} · {selected.brand}</SheetDescription><SheetTitle className="text-2xl text-[#10213d]">{selected.name}</SheetTitle></SheetHeader><div className="p-6"><ProductMark product={selected} large /><p className="detail-model">{selected.model}</p><p className="detail-copy">{selected.description}</p><h3 className="detail-title">المواصفات الأساسية</h3><ul className="spec-list">{selected.specs.map(spec => <li key={spec}><PackageCheck />{spec}</li>)}</ul><div className="detail-note"><ShieldCheck /><span><strong>منتج تجريبي</strong><small>يمكن استبدال البيانات والصورة والمواصفات لاحقاً بسهولة.</small></span></div><Button className="mt-6 w-full rounded-xl bg-[#1258dc]" onClick={() => setSelected(null)}>العودة إلى الكتالوج</Button></div></>}</SheetContent></Sheet>
  </main>;
}
