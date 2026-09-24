import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { getDb } from "@/db";
import { requireAdminPage } from "@/lib/server/admin-page";
import { adminListBrands } from "@/lib/server/admin/catalog";

export default async function BrandsAdminPage() {
  await requireAdminPage("catalog.manage");
  const rows = await adminListBrands(getDb());
  return <>
    <header className="admin-page-header"><div><h1>العلامات التجارية</h1><p>العلامات المتاحة في فلاتر الكتالوج وبطاقات المنتجات.</p></div></header>
    <TaxonomyManager kind="brands" rows={rows} />
  </>;
}
