import { getDb } from "@/db";
import { productImageUrl } from "@/lib/images";
import { getProductBySlug } from "@/lib/server/catalog";
import { jsonData, jsonError } from "@/lib/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(getDb(), slug);
    if (!product) return jsonError(404, "not_found", "المنتج غير موجود.");
    return jsonData({ ...product, imageUrl: productImageUrl(product.imageKey) }, 200, { "cache-control": "public, max-age=60" });
  } catch (error) {
    console.error("[api/products/slug] failed", error);
    return jsonError(500, "server_error", "تعذّر تحميل المنتج حالياً.");
  }
}
