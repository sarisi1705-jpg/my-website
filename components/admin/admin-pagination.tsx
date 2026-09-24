/** Previous / next links that keep the current filters. */
export function AdminPagination({ basePath, params, page, pageCount, total }: { basePath: string; params: Record<string, string | undefined>; page: number; pageCount: number; total: number }) {
  if (pageCount <= 1) return <p className="admin-pagination muted">{total} نتيجة</p>;
  const href = (n: number) => {
    const search = new URLSearchParams(Object.entries({ ...params, page: n > 1 ? String(n) : undefined }).filter((entry): entry is [string, string] => Boolean(entry[1])));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return <nav className="admin-pagination" aria-label="الصفحات">
    {page > 1 ? <a href={href(page - 1)}>السابق</a> : <span className="muted">السابق</span>}
    <span>صفحة {page} من {pageCount} · {total} نتيجة</span>
    {page < pageCount ? <a href={href(page + 1)}>التالي</a> : <span className="muted">التالي</span>}
  </nav>;
}
