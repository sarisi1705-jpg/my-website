import { ChevronRight } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { getDb } from "@/db";
import { can } from "@/lib/auth/roles";
import { requireAdminPage } from "@/lib/server/admin-page";
import { adminListBrands, adminListCategories } from "@/lib/server/admin/catalog";

export default async function NewProductPage() {
  const user = await requireAdminPage("catalog.manage");
  const db = getDb();
  const [brands, categories] = await Promise.all([adminListBrands(db), adminListCategories(db)]);
  return <>
    <a href="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-[#1258dc]"><ChevronRight className="size-4" />كل المنتجات</a>
    <header className="admin-page-header"><div><h1>منتج جديد</h1><p>يُحفظ كمسودة ما لم تختر «منشور».</p></div></header>
    <ProductForm
      initial={{ name: "", model: "", slug: "", brandId: "", categoryId: "", description: "", specs: [""], color: "#1258dc", imageKey: null, price: "", featured: false, status: "draft", sortOrder: 0 }}
      brands={brands.filter(brand => brand.isActive)}
      categories={categories.filter(category => category.isActive)}
      canHardDelete={can(user.role, "products.hardDelete")}
    />
  </>;
}
