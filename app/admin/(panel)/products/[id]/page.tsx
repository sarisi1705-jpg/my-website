import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { ProductStatusBadge } from "@/components/admin/status-badge";
import { getDb } from "@/db";
import { formatDateTime } from "@/lib/admin-format";
import { can } from "@/lib/auth/roles";
import { requireAdminPage } from "@/lib/server/admin-page";
import { adminListBrands, adminListCategories, getAdminProduct } from "@/lib/server/admin/catalog";
import { HttpError } from "@/lib/server/http";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireAdminPage("catalog.manage");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const db = getDb();
  const product = await getAdminProduct(db, id).catch(error => { if (error instanceof HttpError && error.status === 404) notFound(); throw error; });
  const [brands, categories] = await Promise.all([adminListBrands(db), adminListCategories(db)]);
  const { saved } = await searchParams;

  return <>
    <a href="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-[#1258dc]"><ChevronRight className="size-4" />كل المنتجات</a>
    <header className="admin-page-header">
      <div><h1>{product.name}</h1><p>آخر تعديل: {formatDateTime(product.updatedAt)}</p></div>
      <ProductStatusBadge status={product.status} />
    </header>
    {saved && <p className="admin-notice admin-notice--info mb-4">تم الحفظ.</p>}
    <ProductForm
      productId={product.id}
      initial={{
        name: product.name, model: product.model, slug: product.slug, brandId: product.brandId, categoryId: product.categoryId,
        description: product.description, specs: product.specs.length ? product.specs : [""], color: product.color, imageKey: product.imageKey,
        price: product.priceMinor === null ? "" : String(product.priceMinor / 100), featured: product.featured, status: product.status, sortOrder: product.sortOrder,
      }}
      // Keep the current brand/category selectable even if it has been deactivated.
      brands={brands.filter(brand => brand.isActive || brand.id === product.brandId)}
      categories={categories.filter(category => category.isActive || category.id === product.categoryId)}
      canHardDelete={can(user.role, "products.hardDelete")}
    />
  </>;
}
