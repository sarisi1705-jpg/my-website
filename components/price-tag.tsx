import { formatPrice } from "@/lib/format";

export function PriceTag({ priceMinor, currency, large = false }: { priceMinor: number | null; currency: string; large?: boolean }) {
  const className = `price-tag${large ? " price-tag--large" : ""}`;
  return priceMinor === null
    ? <span className={`${className} price-tag--on-request`}>السعر عند الطلب</span>
    : <span className={className} dir="ltr">{formatPrice(priceMinor, currency)}</span>;
}
