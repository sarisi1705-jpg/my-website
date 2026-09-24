import { Plus } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ProductStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { formatDateTime } from "@/lib/admin-format";
import { formatPrice } from "@/lib/format";
import { productImageUrl } from "@/lib/images";
import { requireAdminPage } from "@/lib/server/admin-page";
import { adminListCategories, adminListProducts } from "@/lib/server/admin/catalog";
import { adminProductListQuery } from "@/lib/validation/admin";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("catalog.manage");
  const query = adminProductListQuery.parse(await searchParams);
  const db = getDb();
  const [result, categories] = await Promise.all([adminListProducts(db, query), adminListCategories(db)]);
  const params = { q: query.q, status: query.status, category: query.category };

  return <>
    <header className="admin-page-header">
      <div><h1>المنتجات</h1><p>أضف المنتجات وعدّلها وتحكّم في ظهورها على الموقع.</p></div>
      <Button asChild><a href="/admin/products/new"><Plus />منتج جديد</a></Button>
    </header>
    <form className="admin-filters" method="get">
      <label>بحث<input type="search" name="q" defaultValue={query.q} placeholder="الاسم، الموديل أو العلامة" /></label>
      <label>الحالة<select name="status" defaultValue={query.status ?? ""}><option value="">الكل</option><option value="published">منشور</option><option value="draft">مسودة</option><option value="archived">مؤرشف</option></select></label>
      <label>التصنيف<select name="category" defaultValue={query.category ?? ""}><option value="">الكل</option>{categories.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label>
      <Button type="submit">تطبيق</Button>
      {Object.values(params).some(Boolean) && <Button asChild variant="ghost"><a href="/admin/products">مسح</a></Button>}
    </form>
    {result.items.length ? <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>المنتج</th><th>العلامة</th><th>التصنيف</th><th>السعر</th><th>الحالة</th><th>آخر تعديل</th></tr></thead>
      <tbody>{result.items.map(product => {
        const image = productImageUrl(product.imageKey);
        return <tr key={product.id}>
          <td><div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- R2 images are served directly */}
            {image ? <img src={image} alt="" className="size-10 rounded-lg border object-contain" /> : <span className="size-10 rounded-lg bg-[#eef4ff]" aria-hidden="true" />}
            <div><a href={`/admin/products/${product.id}`}>{product.name}</a>{product.featured && <span className="status-badge status-badge--new mr-2">مختار</span>}<div className="muted" dir="ltr">{product.model}</div></div>
          </div></td>
          <td>{product.brandName}</td>
          <td className="muted">{product.categoryName}</td>
          <td dir="ltr" className="text-right">{product.priceMinor === null ? <span className="muted">عند الطلب</span> : formatPrice(product.priceMinor, product.currency)}</td>
          <td><ProductStatusBadge status={product.status} /></td>
          <td className="muted">{formatDateTime(product.updatedAt)}</td>
        </tr>;
      })}</tbody>
    </table></div> : <div className="admin-card admin-empty">لا توجد منتجات مطابقة.</div>}
    <AdminPagination basePath="/admin/products" params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
  </>;
}
