// Display helpers for the admin panel (client- and server-safe).

const dateTime = new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hebron", numberingSystem: "latn" });

export function formatDateTime(ms: number | null | undefined): string {
  return ms ? dateTime.format(new Date(ms)) : "—";
}

/**
 * wa.me link for a customer's phone. Local numbers (05…) are assumed to be
 * Palestinian (+970), matching the company's own WhatsApp number.
 */
export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = phone.startsWith("+") ? digits : digits.startsWith("0") ? `970${digits.slice(1)}` : digits;
  return `https://wa.me/${international}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
