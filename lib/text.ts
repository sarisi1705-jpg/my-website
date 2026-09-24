// Small text helpers shared by validation and search. Safe for client and server.

const ARABIC_INDIC_ZERO = 0x0660; // ٠
const EASTERN_ARABIC_INDIC_ZERO = 0x06f0; // ۰ (Persian/Urdu)

/** Converts Arabic-Indic and Eastern Arabic-Indic digits to 0-9. */
export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    const zero = code >= EASTERN_ARABIC_INDIC_ZERO ? EASTERN_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO;
    return String(code - zero);
  });
}

/** Trims and collapses internal whitespace runs to a single space. */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
