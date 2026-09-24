import { ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import type { CatalogProduct } from "@/lib/server/catalog";

export function CatalogResults({ items, filtered, resetHref }: { items: CatalogProduct[]; filtered: boolean; resetHref: string }) {
  if (items.length) return <div className="products-grid">{items.map(product => <ProductCard key={product.id} product={product} />)}</div>;
  return filtered
    ? <div className="empty-state"><Search /><h3>لم نجد نتائج مطابقة</h3><p>جرّب كلمة أخرى أو امسح الفلاتر الحالية.</p><Button asChild><a href={resetHref}>عرض كل المنتجات</a></Button></div>
    : <div className="empty-state"><Search /><h3>سيتم إضافة المنتجات قريباً</h3><p>تواصل معنا وسنساعدك في إيجاد ما تحتاجه.</p><Button asChild><a href="/contact?type=quote">تواصل معنا <ChevronLeft /></a></Button></div>;
}
