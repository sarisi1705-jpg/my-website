import type { Metadata } from "next";
import { ChevronLeft, PackageSearch } from "lucide-react";
import { CatalogFilters } from "@/components/catalog-filters";
import { CatalogPagination } from "@/components/catalog-pagination";
import { CatalogResults } from "@/components/catalog-results";
import { ContactSection } from "@/components/contact-section";
import { ServiceStrip } from "@/components/service-strip";
import { getDb } from "@/db";
import { catalogHref, type CatalogParams } from "@/lib/catalog-url";
import { CategoryIcon } from "@/lib/icons";
import { listBrands, listCategoriesWithCounts, listProducts, resolveCategoryParam } from "@/lib/server/catalog";
import { parseCatalogQuery } from "@/lib/validation/catalog";

export const metadata: Metadata = {
  title: "المنتجات | SSPS",
  description: "تصفّح كتالوج الطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة من SSPS.",
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const db = getDb();
  const query = parseCatalogQuery(await searchParams);
  // Old links used Arabic category names; map them (and display names) to slugs.
  const requestedCategory = query.category;
  query.category = await resolveCategoryParam(db, requestedCategory);
  const unknownCategory = Boolean(requestedCategory && !query.category);

  const [categories, brands, page] = await Promise.all([
    listCategoriesWithCounts(db),
    listBrands(db),
    unknownCategory ? Promise.resolve(null) : listProducts(db, query),
  ]);
  const current: CatalogParams = { q: query.q, category: query.category, brand: query.brand, sort: query.sort };
  const filtered = Boolean(query.q || query.category || query.brand || unknownCategory);

  return <>
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><PackageSearch /> كتالوج SSPS</span><h1>المنتجات</h1><p>تصفّح كتالوج الطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة، وابحث أو صفِّ النتائج حسب حاجتك.</p></div></section>

    <section className="catalog-section"><div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading catalog-heading"><div><span>تصفّح الكتالوج</span><h2>كل المنتجات</h2></div></div>

      <div className="category-grid category-grid--filters">
        {categories.map(category => {
          const active = query.category === category.slug;
          return <a key={category.slug} href={catalogHref("/products", { ...current, category: active ? undefined : category.slug })} className="category-card" aria-current={active ? "true" : undefined}>
            <span><CategoryIcon iconKey={category.iconKey} /></span><div><strong>{category.name}</strong><small>{category.productCount} منتج</small></div><ChevronLeft />
          </a>;
        })}
      </div>

      <CatalogFilters basePath="/products" categories={categories} brands={brands} current={current} total={page?.total ?? 0} />
      <CatalogResults items={page?.items ?? []} filtered={filtered} resetHref="/products" />
      {page && <CatalogPagination basePath="/products" params={current} page={page.page} pageCount={page.pageCount} />}
    </div></section>

    <ServiceStrip />
    <ContactSection title="لم تجد ما تبحث عنه؟" />
  </>;
}
