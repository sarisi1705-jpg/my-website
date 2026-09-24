import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { ProductMark } from "@/components/product-mark";
import { productImageUrl } from "@/lib/images";
import type { CatalogProduct } from "@/lib/server/catalog";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const href = `/product/${product.slug}`;
  return <article className="product-card">
    <div className="product-art">
      <span className="brand-chip">{product.brand.name}</span>
      {product.featured && <span className="featured-chip">مختار</span>}
      <ProductMark iconKey={product.category.iconKey} color={product.color} brandName={product.brand.name} imageUrl={productImageUrl(product.imageKey)} alt={product.name} />
    </div>
    <div className="product-body">
      <span className="product-category">{product.category.name}</span>
      <h3>{product.name}</h3>
      <p className="model" dir="ltr">{product.model}</p>
      <p>{product.description}</p>
      <PriceTag priceMinor={product.priceMinor} currency={product.currency} />
      <Button asChild variant="outline"><a href={href} aria-label={`عرض تفاصيل ${product.name}`}>عرض التفاصيل <ChevronLeft /></a></Button>
    </div>
  </article>;
}
