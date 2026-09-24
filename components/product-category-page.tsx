import { ChevronLeft, PackageCheck, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSection } from "@/components/contact-section";
import { ProductMark } from "@/components/product-mark";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getProductCategory } from "@/data/product-categories";
import { products, slugToCategory } from "@/data/products";

export function ProductCategoryPage({ slug }: { slug: string }) {
  const category = getProductCategory(slug);
  if (!category) throw new Error(`Unknown product category: ${slug}`);

  const matchedCategory = slugToCategory[slug];
  const items = matchedCategory ? products.filter(p => p.category === matchedCategory) : [];

  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader active="products" />
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><PackageSearch /> قسم المنتجات</span><h1>{category.name}</h1><p>{category.description}</p></div></section>

    <section className="catalog-section"><div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading catalog-heading"><div><span>{category.name}</span><h2>منتجات هذا القسم</h2></div><a target="_top" href="/products">كل المنتجات <ChevronLeft /></a></div>

      {items.length ? <div className="products-grid">{items.map(product => <article className="product-card" key={product.id}><div className="product-art"><span className="brand-chip">{product.brand}</span>{product.featured && <span className="featured-chip">مختار</span>}<ProductMark product={product} /></div><div className="product-body"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p className="model">{product.model}</p><p>{product.description}</p><ul className="spec-list">{product.specs.map(spec => <li key={spec}><PackageCheck />{spec}</li>)}</ul></div></article>)}</div>
        : <div className="empty-state"><PackageSearch /><h3>سيتم إضافة منتجات هذا القسم قريباً</h3><p>تواصل معنا مباشرة وسنساعدك في إيجاد الحل المناسب ضمن {category.name}.</p><Button asChild><a target="_top" href="/contact">تواصل معنا <ChevronLeft /></a></Button></div>}
    </div></section>

    <ContactSection title={`استفسار عن ${category.name}؟`} />
    <SiteFooter />
  </main>;
}
