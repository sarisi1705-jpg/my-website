import { PackageSearch } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getProductCategory } from "@/data/product-categories";

export function ProductCategoryPage({ slug }: { slug: string }) {
  const category = getProductCategory(slug);
  if (!category) throw new Error(`Unknown product category: ${slug}`);

  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader active="products" />
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><PackageSearch /> قسم المنتجات</span><h1>{category.name}</h1><p>{category.description}</p></div></section>
    <section className="placeholder-space mx-auto max-w-[1200px] px-4 py-14 sm:px-8 lg:px-12" aria-label={`مساحة منتجات قسم ${category.name}`}><div aria-hidden="true" /></section>
    <SiteFooter />
  </main>;
}
