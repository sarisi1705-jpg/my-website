import { describe, expect, it } from "vitest";
import { constantTimeEqual, generateTemporaryPassword, hashPassword, needsRehash, PBKDF2_ITERATIONS, verifyPassword } from "@/lib/auth/password";
import { adminRoles, can, capabilities } from "@/lib/auth/roles";
import { isSameOrigin, readSessionToken, sessionCookie } from "@/lib/server/auth";
import { priceInput, productInput } from "@/lib/validation/admin";

describe("password hashing", () => {
  it("round-trips and rejects wrong passwords", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).toMatch(/^pbkdf2\$sha256\$100000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterY", stored)).toBe(false);
  });

  it("uses a fresh salt every time", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"));
  });

  it("rejects malformed or out-of-range hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2$sha256$999999999$AAAA$AAAA")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$2b$10$abc")).toBe(false);
  });

  it("flags hashes below the current iteration count for upgrade", async () => {
    expect(needsRehash(await hashPassword("pw-123456789", 1000))).toBe(true);
    expect(needsRehash(await hashPassword("pw-123456789", PBKDF2_ITERATIONS))).toBe(false);
  });

  it("compares in constant time and handles different lengths", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 0]))).toBe(false);
  });

  it("generates readable temporary passwords", () => {
    const password = generateTemporaryPassword();
    expect(password).toHaveLength(14);
    expect(password).not.toMatch(/[0O1lI]/);
  });
});

describe("roles", () => {
  const expected: Record<string, string[]> = {
    owner: [...capabilities],
    editor: ["dashboard.view", "catalog.manage"],
    sales: ["dashboard.view", "inquiries.view", "inquiries.manage", "inquiries.export", "orders.view", "orders.manage"],
  };
  for (const role of adminRoles) {
    it(`${role} has exactly the planned capabilities`, () => {
      expect(capabilities.filter(capability => can(role, capability))).toEqual(expected[role]);
    });
  }
});

describe("session cookie and CSRF helpers", () => {
  it("sets a secure, http-only cookie and reads it back", () => {
    expect(sessionCookie("abc")).toMatch(/^ssps_session=abc; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=\d+$/);
    const request = new Request("https://site.test/api", { headers: { cookie: "a=1; ssps_session=tok-en_1; b=2" } });
    expect(readSessionToken(request)).toBe("tok-en_1");
    expect(readSessionToken(new Request("https://site.test/api"))).toBeNull();
  });

  it("accepts only same-origin requests", () => {
    expect(isSameOrigin(new Request("https://site.test/api", { method: "POST", headers: { origin: "https://site.test" } }))).toBe(true);
    expect(isSameOrigin(new Request("https://site.test/api", { method: "POST", headers: { origin: "https://evil.test" } }))).toBe(false);
    expect(isSameOrigin(new Request("https://site.test/api", { method: "POST" }))).toBe(false);
  });
});

describe("admin validation", () => {
  it.each([
    ["", null],
    [null, null],
    ["1250", 125000],
    ["1,250.5", 125050],
    ["١٢٥٠", 125000],
    ["₪ 99.99", 9999],
    [42, 4200],
  ])("price %j → %j", (input, expected) => {
    expect(priceInput.parse(input)).toBe(expected);
  });

  it("rejects malformed prices", () => {
    expect(priceInput.safeParse("12.345").success).toBe(false);
    expect(priceInput.safeParse("abc").success).toBe(false);
    expect(priceInput.safeParse("-5").success).toBe(false);
  });

  it("cleans up product input", () => {
    const parsed = productInput.parse({ name: "  تونر   أسود ", brandId: "3", categoryId: 2, specs: [" ليزر ", "", "أسود"], slug: "", imageKey: "" });
    expect(parsed).toMatchObject({ name: "تونر أسود", brandId: 3, categoryId: 2, specs: ["ليزر", "أسود"], slug: undefined, imageKey: null, price: null, status: "draft" });
    expect(productInput.safeParse({ name: "x y", brandId: 1, categoryId: 1, slug: "Bad Slug" }).success).toBe(false);
    expect(productInput.safeParse({ name: "x y", brandId: 1, categoryId: 1, imageKey: "../../etc/passwd" }).success).toBe(false);
  });
});
