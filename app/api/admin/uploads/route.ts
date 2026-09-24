import { env } from "cloudflare:workers";
import { adminRoute } from "@/lib/server/admin-route";
import { logAudit } from "@/lib/server/audit";
import { HttpError, jsonData } from "@/lib/server/http";
import { detectImageType, MAX_IMAGE_BYTES, storeProductImage } from "@/lib/server/images";
import { productImageUrl } from "@/lib/images";

const TOO_LARGE = "الصورة أكبر من 5 ميغابايت.";

export const POST = adminRoute("catalog.manage", async ({ request, db, user }) => {
  // Refuse obviously oversized uploads before reading the body.
  if (Number(request.headers.get("content-length") ?? "0") > MAX_IMAGE_BYTES + 64 * 1024) throw new HttpError(413, "too_large", TOO_LARGE);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new HttpError(400, "no_file", "اختر صورة لرفعها.");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "too_large", TOO_LARGE);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new HttpError(400, "unsupported_type", "الصيغ المدعومة: JPG و PNG و WebP.");

  const key = await storeProductImage(env.BUCKET, bytes, type);
  await logAudit(db, { userId: user.id, action: "image.upload", entity: "image", entityId: key, details: { bytes: bytes.length } });
  return jsonData({ key, url: productImageUrl(key) }, 201);
});
