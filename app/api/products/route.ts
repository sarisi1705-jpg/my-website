import { getDb } from "@/db";
import { productImageUrl } from "@/lib/images";
import { listProducts, resolveCategoryParam } from "@/lib/server/catalog";
import { jsonData, jsonError } from "@/lib/server/http";
import { parseCatalogQuery } from "@/lib/validation/catalog";

const CACHE = { "cache-control": "public, max-age=60" };

export async function GET(request: Request) {
  try {
    const db = getDb();
    const query = parseCatalogQuery(new URL(request.url).searchParams);
    if (query.category) {
      const slug = await resolveCategoryParam(db, query.category);
      // Unknown category: an empty page rather than silently showing everything.
      if (!slug) return jsonData({ items: [], total: 0, page: query.page, pageSize: query.pageSize, pageCount: 1 }, 200, CACHE);
      query.category = slug;
    }
    const page = await listProducts(db, query);
    return jsonData({ ...page, items: page.items.map(item => ({ ...item, imageUrl: productImageUrl(item.imageKey) })) }, 200, CACHE);
  } catch (error) {
    console.error("[api/products] failed", error);
    return jsonError(500, "server_error", "تعذّر تحميل المنتجات حالياً.");
  }
}
