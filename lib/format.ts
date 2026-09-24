/** "₪1,250" or "₪1,250.50" from minor units (agorot). Latin digits, matching the rest of the site. */
export function formatPrice(priceMinor: number, currency: string): string {
  const hasFraction = priceMinor % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(priceMinor / 100);
}
