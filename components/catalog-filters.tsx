"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, Grid2X2, Loader2, Search, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalogHref, type CatalogParams } from "@/lib/catalog-url";
import type { CatalogSort } from "@/lib/validation/catalog";

type Option = { slug: string; name: string };

const ALL = "all";
const SEARCH_DELAY_MS = 350;
const sortLabels: Record<CatalogSort, string> = { featured: "المختارة أولاً", newest: "الأحدث", name: "الاسم" };

/**
 * Filters live in the URL, so results are rendered on the server and every
 * filtered view can be shared or bookmarked. Changing a filter resets paging.
 */
export function CatalogFilters({ basePath, categories, brands, current, total, showCategory = true }: {
  basePath: string;
  categories: Option[];
  brands: Option[];
  current: CatalogParams;
  total: number;
  showCategory?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(current.q ?? "");
  const lastPushedQuery = useRef(current.q ?? "");

  // Typing replaces the history entry (no entry per keystroke); picking a
  // filter pushes one, so Back undoes it.
  function navigate(next: CatalogParams, mode: "push" | "replace" = "push") {
    const href = catalogHref(basePath, { ...next, page: undefined });
    startTransition(() => (mode === "push" ? router.push(href, { scroll: false }) : router.replace(href, { scroll: false })));
  }

  // Follow the URL when it changes from outside (back/forward, a link).
  useEffect(() => {
    const fromUrl = current.q ?? "";
    if (fromUrl !== lastPushedQuery.current) {
      lastPushedQuery.current = fromUrl;
      setQuery(fromUrl);
    }
  }, [current.q]);

  // Search as the visitor types, after a short pause.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === lastPushedQuery.current) return;
    const timer = setTimeout(() => {
      lastPushedQuery.current = trimmed;
      navigate({ ...current, q: trimmed || undefined }, "replace");
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should restart the timer
  }, [query]);

  const hasFilters = Boolean(current.q || current.brand || (showCategory && current.category) || (current.sort && current.sort !== "featured"));

  return <form className="filter-bar" role="search" onSubmit={event => { event.preventDefault(); lastPushedQuery.current = query.trim(); navigate({ ...current, q: query.trim() || undefined }); }}>
    <label className="filter-search">
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
      <Input aria-label="ابحث داخل الكتالوج" type="search" enterKeyHint="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بالاسم، الموديل أو العلامة التجارية..." />
    </label>
    {showCategory && <Select value={current.category ?? ALL} onValueChange={value => navigate({ ...current, category: value === ALL ? undefined : value })}>
      <SelectTrigger className="filter-select" aria-label="التصنيف"><Grid2X2 /><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>كل التصنيفات</SelectItem>
        {categories.map(category => <SelectItem key={category.slug} value={category.slug}>{category.name}</SelectItem>)}
      </SelectContent>
    </Select>}
    <Select value={current.brand ?? ALL} onValueChange={value => navigate({ ...current, brand: value === ALL ? undefined : value })}>
      <SelectTrigger className="filter-select" aria-label="العلامة التجارية"><Tag /><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>كل العلامات</SelectItem>
        {brands.map(brand => <SelectItem key={brand.slug} value={brand.slug}>{brand.name}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={current.sort ?? "featured"} onValueChange={value => navigate({ ...current, sort: value as CatalogSort })}>
      <SelectTrigger className="filter-select" aria-label="الترتيب"><ArrowDownUp /><SelectValue /></SelectTrigger>
      <SelectContent>
        {(Object.keys(sortLabels) as CatalogSort[]).map(sort => <SelectItem key={sort} value={sort}>{sortLabels[sort]}</SelectItem>)}
      </SelectContent>
    </Select>
    {hasFilters && <Button type="button" variant="ghost" onClick={() => { lastPushedQuery.current = ""; setQuery(""); navigate({}); }}>مسح الفلاتر <X /></Button>}
    <span className="results-count" aria-live="polite">{total} منتج</span>
  </form>;
}
