import { ChevronLeft, ChevronRight } from "lucide-react";
import { catalogHref, type CatalogParams } from "@/lib/catalog-url";

/** Page links; in RTL "next" points left. Shows first, last and the pages around the current one. */
export function CatalogPagination({ basePath, params, page, pageCount }: { basePath: string; params: CatalogParams; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])].filter(n => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const href = (n: number) => catalogHref(basePath, { ...params, page: n });

  return <nav className="catalog-pagination" aria-label="صفحات النتائج">
    {page > 1 ? <a href={href(page - 1)} rel="prev"><ChevronRight aria-hidden="true" />السابق</a> : <span aria-disabled="true"><ChevronRight aria-hidden="true" />السابق</span>}
    <ol>
      {pages.map((n, index) => <li key={n}>
        {index > 0 && n - pages[index - 1] > 1 && <span className="catalog-pagination-gap" aria-hidden="true">…</span>}
        {n === page ? <span aria-current="page">{n}</span> : <a href={href(n)} aria-label={`الصفحة ${n}`}>{n}</a>}
      </li>)}
    </ol>
    {page < pageCount ? <a href={href(page + 1)} rel="next">التالي<ChevronLeft aria-hidden="true" /></a> : <span aria-disabled="true">التالي<ChevronLeft aria-hidden="true" /></span>}
  </nav>;
}
