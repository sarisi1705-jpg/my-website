import { PRODUCT_IMAGE_PREFIX } from "@/lib/images";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageType = { ext: "jpg" | "png" | "webp"; contentType: string };

/** Identifies JPEG, PNG and WebP by their first bytes; the browser's claimed type is not trusted. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((byte, index) => bytes[index] === byte)) return { ext: "png", contentType: "image/png" };
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", contentType: "image/webp" };
  return null;
}

export async function storeProductImage(bucket: R2Bucket, bytes: Uint8Array, type: ImageType): Promise<string> {
  const key = `${PRODUCT_IMAGE_PREFIX}${crypto.randomUUID()}.${type.ext}`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: type.contentType, cacheControl: "public, max-age=31536000, immutable" } });
  return key;
}

/** Best effort: a leftover image costs a little storage, a failed delete must not fail the request. */
export async function deleteProductImage(bucket: R2Bucket, key: string | null | undefined): Promise<void> {
  if (!key?.startsWith(PRODUCT_IMAGE_PREFIX)) return;
  try {
    await bucket.delete(key);
  } catch (error) {
    console.error("[images] failed to delete", key, error);
  }
}
