import { categoryIcon, type Product } from "@/data/products";

export function ProductMark({ product, large = false }: { product: Product; large?: boolean }) {
  const Icon = categoryIcon[product.category];
  return <div className={large ? "product-mark product-mark--large" : "product-mark"} style={{ "--product-color": product.color } as React.CSSProperties}><span className="product-orbit" /><Icon aria-hidden="true" strokeWidth={1.55} /><span className="product-code">{product.brand.slice(0, 2).toUpperCase()}</span></div>;
}
