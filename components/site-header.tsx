import { getDb } from "@/db";
import { listCategoriesWithCounts } from "@/lib/server/catalog";
import { SiteHeaderNav, type HeaderCategory } from "./site-header-nav";

/** Loads the product categories for the menu, then renders the interactive header. */
export async function SiteHeader() {
  let categories: HeaderCategory[] = [];
  try {
    categories = (await listCategoriesWithCounts(getDb())).map(({ slug, name, description }) => ({ slug, name, description }));
  } catch (error) {
    // The header must never take the page down; the menu just shows no categories.
    console.error("[site-header] failed to load categories", error);
  }
  return <SiteHeaderNav categories={categories} />;
}
