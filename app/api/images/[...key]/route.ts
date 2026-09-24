import { env } from "cloudflare:workers";
import { PRODUCT_IMAGE_PREFIX } from "@/lib/images";

const KEY_PATTERN = /^products\/[a-z0-9-]+\.(jpg|png|webp)$/;

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!key.startsWith(PRODUCT_IMAGE_PREFIX) || !KEY_PATTERN.test(key)) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.BUCKET.get(key, { onlyIf: request.headers });
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // Keys are unique per upload, so a URL's content never changes.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");

  // onlyIf matched a conditional header (If-None-Match): the browser's copy is current.
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}
