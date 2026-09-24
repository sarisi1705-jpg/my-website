import type { CatalogSort } from "@/lib/validation/catalog";

export type CatalogParams = { q?: string; category?: string; brand?: string; sort?: CatalogSort; page?: number };

/** A catalog URL with default values left out, so links stay short and shareable. */
export function catalogHref(basePath: string, params: CatalogParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.brand) search.set("brand", params.brand);
  if (params.sort && params.sort !== "featured") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
