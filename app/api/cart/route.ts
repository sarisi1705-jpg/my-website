import { getDb } from "@/db";
import { discardBody, fieldErrorsFrom, jsonData, jsonError, readJson } from "@/lib/server/http";
import { priceCart } from "@/lib/server/orders";
import { cartRequest } from "@/lib/validation/order";

const MAX_BODY_BYTES = 8 * 1024;

/** Prices the browser's cart from the current catalog. Read-only, so no spam checks. */
export async function POST(request: Request) {
  const body = await readJson(request, MAX_BODY_BYTES);
  await discardBody(request);
  if (body === undefined) return jsonError(400, "invalid_body", "تعذّر قراءة السلة.");

  const parsed = cartRequest.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_failed", "محتوى السلة غير صالح.", { fieldErrors: fieldErrorsFrom(parsed.error) });
  }
  try {
    return jsonData(await priceCart(getDb(), parsed.data.items), 200, { "cache-control": "no-store" });
  } catch (error) {
    console.error("[cart] failed to price cart", error);
    return jsonError(500, "server_error", "تعذّر تحميل السلة. يرجى المحاولة لاحقاً.");
  }
}
