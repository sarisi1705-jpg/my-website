import type { MetadataRoute } from "next";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { listCategoriesWithCounts, listPublishedSlugs } from "@/lib/server/catalog";

const STATIC_PAGES = ["", "/products", "/categories", "/services", "/offers", "/about", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.PUBLIC_SITE_URL.replace(/\/$/, "");
  const db = getDb();
  const [categories, products] = await Promise.all([listCategoriesWithCounts(db), listPublishedSlugs(db)]);
  return [
    ...STATIC_PAGES.map(path => ({ url: `${base}${path || "/"}` })),
    ...categories.map(category => ({ url: `${base}/products/${category.slug}` })),
    ...products.map(product => ({ url: `${base}/product/${product.slug}`, lastModified: new Date(product.updatedAt) })),
  ];
}
