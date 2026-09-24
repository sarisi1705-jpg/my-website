import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { getDb } from "@/db";
import { requireAdminPage } from "@/lib/server/admin-page";
import { adminListCategories } from "@/lib/server/admin/catalog";

export default async function CategoriesAdminPage() {
  await requireAdminPage("catalog.manage");
  const rows = await adminListCategories(getDb());
  return <>
    <header className="admin-page-header"><div><h1>التصنيفات</h1><p>أقسام المنتجات التي تظهر في القائمة وصفحات الأقسام.</p></div></header>
    <TaxonomyManager kind="categories" rows={rows} />
  </>;
}
