import { getDb } from "@/db";
import { listCategoriesWithCounts } from "@/lib/server/catalog";
import { jsonData, jsonError } from "@/lib/server/http";

export async function GET() {
  try {
    return jsonData(await listCategoriesWithCounts(getDb()), 200, { "cache-control": "public, max-age=60" });
  } catch (error) {
    console.error("[api/categories] failed", error);
    return jsonError(500, "server_error", "تعذّر تحميل الأقسام حالياً.");
  }
}
