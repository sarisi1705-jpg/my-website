import { ChevronLeft, Headphones, PackageCheck, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSection } from "@/components/contact-section";
import { HeroCarousel } from "@/components/hero-carousel";
import { OffersPanel } from "@/components/offers-panel";
import { ProductCard } from "@/components/product-card";
import { ServiceStrip } from "@/components/service-strip";
import { StatsSection } from "@/components/stats-section";
import { getDb } from "@/db";
import { CategoryIcon } from "@/lib/icons";
import { listCategoriesWithCounts, listProducts } from "@/lib/server/catalog";
import { parseCatalogQuery } from "@/lib/validation/catalog";

const FEATURED_COUNT = 8;

export default async function Home() {
  const db = getDb();
  const [categories, featured] = await Promise.all([
    listCategoriesWithCounts(db),
    // Featured products first, topped up with the rest of the catalog.
    listProducts(db, parseCatalogQuery({ pageSize: String(FEATURED_COUNT) })),
  ]);

  return <>
    <StatsSection />

    <section id="top" className="hero-grid overflow-hidden"><div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-20"><div className="flex flex-col justify-center">
      <span className="eyebrow"><Sparkles /> حلول متكاملة لمكان عمل أكثر كفاءة</span><h1>حلول الطباعة<br /><span>تبدأ من هنا.</span></h1><p className="hero-copy">اكتشف مجموعة مختارة من الطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة من علامات موثوقة.</p>
      {/* A plain GET form: works before JavaScript loads and lands on the server-rendered results. */}
      <form className="hero-search" role="search" action="/products" method="get"><Search aria-hidden="true" /><input className="hero-search-input" name="q" type="search" enterKeyHint="search" aria-label="ابحث عن منتج" placeholder="ابحث بالاسم، الموديل أو العلامة التجارية..." /><Button type="submit">بحث</Button></form>
      <div className="trust-row"><span><PackageCheck /> منتجات مختارة</span><span><ShieldCheck /> جودة موثوقة</span><span><Headphones /> دعم متخصص</span></div>
    </div><HeroCarousel /></div></section>

    <div className="discovery-layout mx-auto max-w-[1440px] px-4 py-14 sm:px-8 lg:px-12"><section id="categories"><div className="section-heading"><div><span>تصفّح بسهولة</span><h2>الأقسام الرئيسية</h2></div><a href="/products">عرض جميع المنتجات <ChevronLeft /></a></div><div className="category-grid">
      {categories.filter(category => category.productCount > 0).map(category =>
        <a key={category.slug} href={`/products/${category.slug}`} className="category-card"><span><CategoryIcon iconKey={category.iconKey} /></span><div><strong>{category.name}</strong><small>{category.productCount} منتج</small></div><ChevronLeft /></a>)}
    </div></section><OffersPanel /></div>

    <section id="catalog" className="catalog-section"><div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading catalog-heading"><div><span>كتالوج SSPS</span><h2>منتجات مختارة</h2></div><a href="/products">عرض جميع المنتجات <ChevronLeft /></a></div>
      <div className="products-grid">{featured.items.map(product => <ProductCard key={product.id} product={product} />)}</div>
    </div></section>

    <ServiceStrip id="services" />
    <ContactSection />
  </>;
}
