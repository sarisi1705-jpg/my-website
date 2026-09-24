// PBKDF2-SHA256 password hashing with WebCrypto (works in Workers and Node).
// Format: pbkdf2$sha256$<iterations>$<salt base64>$<hash base64>. The
// iteration count is stored per hash so it can be raised later; hashes with
// fewer iterations are upgraded on the next successful login.

/** workerd rejects PBKDF2 above 100,000 iterations. */
export const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export const MIN_PASSWORD_LENGTH = 10;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, HASH_BITS);
  return new Uint8Array(bits);
}

/** Compares without exiting early, so timing doesn't reveal how much matched. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index++) diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return diff === 0;
}

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2$sha256$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

function parse(stored: string): { iterations: number; salt: Uint8Array<ArrayBuffer>; hash: Uint8Array } | null {
  const [scheme, digest, iterationsText, saltText, hashText] = stored.split("$");
  const iterations = Number(iterationsText);
  if (scheme !== "pbkdf2" || digest !== "sha256" || !Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return null;
  try {
    return { iterations, salt: fromBase64(saltText), hash: fromBase64(hashText) };
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed) return false;
  return constantTimeEqual(await derive(password, parsed.salt, parsed.iterations), parsed.hash);
}

export function needsRehash(stored: string): boolean {
  const parsed = parse(stored);
  return !parsed || parsed.iterations < PBKDF2_ITERATIONS;
}

/** A stored hash for a random password: verifying unknown emails against it keeps login timing uniform. */
export const DUMMY_PASSWORD_HASH = "pbkdf2$sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

/** A readable temporary password (no look-alike characters), e.g. for staff invitations. */
export function generateTemporaryPassword(length = 14): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
}
