const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

/**
 * Verifies a Turnstile token with Cloudflare. Fails closed: a missing secret,
 * empty token or network error all reject the submission.
 */
export async function verifyTurnstile(
  { secret, token, ip }: { secret: string | undefined; token: string; ip?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileResult> {
  if (!secret) return { ok: false, reason: "turnstile-secret-missing" };
  if (!token) return { ok: false, reason: "turnstile-token-missing" };

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const response = await fetchImpl(SITEVERIFY_URL, { method: "POST", body });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    return result.success
      ? { ok: true }
      : { ok: false, reason: (result["error-codes"] ?? ["turnstile-rejected"]).join(",") };
  } catch (error) {
    return { ok: false, reason: `turnstile-unreachable: ${error instanceof Error ? error.message : String(error)}` };
  }
}
