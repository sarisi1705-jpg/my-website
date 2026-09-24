import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, PackageSearch } from "lucide-react";
import { CatalogFilters } from "@/components/catalog-filters";
import { CatalogPagination } from "@/components/catalog-pagination";
import { CatalogResults } from "@/components/catalog-results";
import { ContactSection } from "@/components/contact-section";
import { getDb } from "@/db";
import type { CatalogParams } from "@/lib/catalog-url";
import { listBrands, listCategoriesWithCounts, listProducts } from "@/lib/server/catalog";
import { parseCatalogQuery } from "@/lib/validation/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function findCategory(slug: string) {
  return (await listCategoriesWithCounts(getDb())).find(category => category.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await findCategory((await params).slug);
  return category ? { title: `${category.name} | SSPS`, description: category.description } : { title: "القسم غير موجود | SSPS" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();

  const db = getDb();
  const query = { ...parseCatalogQuery(await searchParams), category: slug };
  const [brands, page] = await Promise.all([listBrands(db), listProducts(db, query)]);
  const basePath = `/products/${slug}`;
  const current: CatalogParams = { q: query.q, brand: query.brand, sort: query.sort };
  const filtered = Boolean(query.q || query.brand);

  return <>
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><PackageSearch /> قسم المنتجات</span><h1>{category.name}</h1><p>{category.description}</p></div></section>

    <section className="catalog-section"><div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading catalog-heading"><div><span>{category.name}</span><h2>منتجات هذا القسم</h2></div><a href="/products">كل المنتجات <ChevronLeft /></a></div>
      {category.productCount > 0 && <CatalogFilters basePath={basePath} categories={[]} brands={brands} current={current} total={page.total} showCategory={false} />}
      <CatalogResults items={page.items} filtered={filtered} resetHref={basePath} />
      <CatalogPagination basePath={basePath} params={current} page={page.page} pageCount={page.pageCount} />
    </div></section>

    <ContactSection title={`استفسار عن ${category.name}؟`} />
  </>;
}
