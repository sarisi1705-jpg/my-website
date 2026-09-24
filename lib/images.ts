// Product images live in R2 under products/<uuid>.<ext> and are served by
// /api/images/[...key]. Keys are unique per upload, so URLs can be cached forever.

export const PRODUCT_IMAGE_PREFIX = "products/";

export function productImageUrl(imageKey: string | null | undefined): string | null {
  return imageKey ? `/api/images/${imageKey}` : null;
}
