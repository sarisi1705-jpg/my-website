import { collapseWhitespace, toLatinDigits } from "@/lib/text";

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

/**
 * Folds Arabic spelling variants so searches match regardless of how people
 * type: hamza forms of alef, taa marbuta/haa, alef maqsura/yaa, diacritics,
 * tatweel and Arabic-Indic digits. Latin text is lowercased.
 */
export function normalizeArabic(value: string): string {
  return collapseWhitespace(
    toLatinDigits(value)
      .toLowerCase()
      .replace(DIACRITICS, "")
      .replace(TATWEEL, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي"),
  );
}

/** Search terms from a visitor's query: normalized, de-duplicated, capped. */
export function searchTerms(query: string, maxTerms = 6): string[] {
  const terms = normalizeArabic(query).split(" ").filter(Boolean);
  return [...new Set(terms)].slice(0, maxTerms);
}

/** The stored search_text for a product. */
export function buildSearchText(parts: {
  name: string;
  model: string;
  brand: string;
  category: string;
  specs?: string[];
  description?: string;
}): string {
  return normalizeArabic([parts.name, parts.model, parts.brand, parts.category, ...(parts.specs ?? []), parts.description ?? ""].join(" "));
}

/** Escapes LIKE wildcards so "%" and "_" in a query match literally (use with ESCAPE '\'). */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, character => `\\${character}`);
}
