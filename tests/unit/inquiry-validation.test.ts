import { describe, expect, it } from "vitest";
import { formatInquiryReference, inquiryFields, inquiryRequest, normalizePhone } from "@/lib/validation/inquiry";
import { toLatinDigits } from "@/lib/text";

const valid = { type: "quote", name: "أحمد خليل", phone: "0599123456" };

function errorsOf(input: unknown) {
  const result = inquiryFields.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map(issue => [issue.path.join("."), issue.message]));
}

describe("toLatinDigits", () => {
  it("converts Arabic-Indic and Eastern Arabic-Indic digits", () => {
    expect(toLatinDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toLatinDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toLatinDigits("SSPS-٠٠٣ abc")).toBe("SSPS-003 abc");
  });
});

describe("normalizePhone", () => {
  it.each([
    ["059-912 3456", "0599123456"],
    ["٠٥٩٩ ١٢٣ ٤٥٦", "0599123456"],
    ["+970 (59) 912-3456", "+970599123456"],
    ["  +972.52.123.4567 ", "+972521234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe("inquiryFields", () => {
  it("accepts a minimal quote and applies defaults", () => {
    const result = inquiryFields.parse(valid);
    expect(result).toMatchObject({ type: "quote", preferredContact: "phone", message: "" });
    expect(result.email).toBeUndefined();
    expect(result.quantity).toBeUndefined();
  });

  it("tidies names and converts numeric strings", () => {
    const result = inquiryFields.parse({ ...valid, name: "  خالد    منصور ", quantity: "٣", productId: "7" });
    expect(result.name).toBe("خالد منصور");
    expect(result.quantity).toBe(3);
    expect(result.productId).toBe(7);
  });

  it("treats blank optional fields as missing", () => {
    const result = inquiryFields.parse({ ...valid, email: "  ", company: "", quantity: "" });
    expect(result.email).toBeUndefined();
    expect(result.company).toBeUndefined();
    expect(result.quantity).toBeUndefined();
  });

  it("lowercases email", () => {
    expect(inquiryFields.parse({ ...valid, email: " Sales@Example.COM " }).email).toBe("sales@example.com");
  });

  it("rejects missing and malformed required fields with Arabic messages", () => {
    const errors = errorsOf({ type: "quote", name: "a", phone: "12" });
    expect(errors.name).toMatch(/الاسم/);
    expect(errors.phone).toMatch(/رقم هاتف/);
  });

  it("requires a message for service and contact requests, not quotes", () => {
    expect(errorsOf({ ...valid, type: "service", message: "hi" }).message).toBeDefined();
    expect(errorsOf({ ...valid, type: "contact" }).message).toBeDefined();
    expect(errorsOf({ ...valid, type: "quote" }).message).toBeUndefined();
  });

  it("requires an email when email is the preferred contact", () => {
    expect(errorsOf({ ...valid, preferredContact: "email" }).email).toBeDefined();
    expect(errorsOf({ ...valid, preferredContact: "email", email: "a@b.co" }).email).toBeUndefined();
  });

  it("enforces length and range limits", () => {
    expect(errorsOf({ ...valid, name: "ا".repeat(101) }).name).toBeDefined();
    expect(errorsOf({ ...valid, message: "x".repeat(2001) }).message).toBeDefined();
    expect(errorsOf({ ...valid, quantity: "0" }).quantity).toBeDefined();
    expect(errorsOf({ ...valid, quantity: "100001" }).quantity).toBeDefined();
    expect(errorsOf({ ...valid, quantity: "2.5" }).quantity).toBeDefined();
    expect(errorsOf({ ...valid, phone: "1".repeat(16) }).phone).toBeDefined();
  });

  it("rejects unknown request types and contact methods", () => {
    expect(errorsOf({ ...valid, type: "order" }).type).toBeDefined();
    expect(errorsOf({ ...valid, preferredContact: "fax" }).preferredContact).toBeDefined();
  });
});

describe("inquiryRequest", () => {
  it("defaults the Turnstile token to an empty string", () => {
    expect(inquiryRequest.parse({ fields: valid }).turnstileToken).toBe("");
  });
});

describe("formatInquiryReference", () => {
  it("pads the id to six digits", () => {
    expect(formatInquiryReference(3)).toBe("SSPS-000003");
    expect(formatInquiryReference(1234567)).toBe("SSPS-1234567");
  });
});
