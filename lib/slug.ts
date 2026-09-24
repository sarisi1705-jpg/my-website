import { toLatinDigits } from "@/lib/text";

/**
 * ASCII URL slug: lowercase letters, digits and single dashes. Arabic letters
 * are dropped, so product slugs are built from brand + model (e.g.
 * "xerox-versalink-b415"); returns "" when nothing usable remains.
 */
export function slugify(value: string, maxLength = 80): string {
  return toLatinDigits(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
