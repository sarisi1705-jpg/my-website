import { z } from "zod";

export const catalogSorts = ["featured", "newest", "name"] as const;
export type CatalogSort = (typeof catalogSorts)[number];

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 48;

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const optionalParam = (max: number) =>
  z.preprocess(value => {
    const first = firstValue(value);
    return typeof first === "string" && first.trim() ? first.trim().slice(0, max) : undefined;
  }, z.string().optional());
const intParam = (fallback: number, min: number, max: number) =>
  z.preprocess(value => {
    const parsed = Number.parseInt(String(firstValue(value) ?? ""), 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
  }, z.number());

/**
 * Catalog filters from a URL. Never fails: bad values fall back to defaults,
 * so a mangled link still shows the catalog.
 */
export const catalogQuery = z.object({
  q: optionalParam(100),
  category: optionalParam(80),
  brand: optionalParam(80),
  featured: z.preprocess(value => ["1", "true"].includes(String(firstValue(value))), z.boolean()),
  sort: z.preprocess(value => (catalogSorts.includes(firstValue(value) as CatalogSort) ? firstValue(value) : "featured"), z.enum(catalogSorts)),
  page: intParam(1, 1, 1000),
  pageSize: intParam(DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
});

export type CatalogQuery = z.output<typeof catalogQuery>;

export function parseCatalogQuery(params: Record<string, unknown> | URLSearchParams): CatalogQuery {
  const record = params instanceof URLSearchParams ? Object.fromEntries(params.entries()) : params;
  return catalogQuery.parse(record);
}
