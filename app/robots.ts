import type { MetadataRoute } from "next";
import { env } from "cloudflare:workers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/sitemap.xml`,
  };
}
