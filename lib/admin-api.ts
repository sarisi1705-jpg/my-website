// Browser-side helper for the admin API: JSON in, { data } or ApiError out.

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly fieldErrors: Record<string, string> = {}) {
    super(message);
  }
}

/** `signIn: true` is for the login form itself: a 401 there means wrong credentials, not an expired session. */
export async function adminApi<T>(url: string, options: { method?: string; body?: unknown; form?: FormData; signIn?: boolean } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? (options.body !== undefined || options.form ? "POST" : "GET"),
      headers: options.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network", "تعذّر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.");
  }
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { code: string; message: string; fieldErrors?: Record<string, string> } };
  if (response.ok) return payload.data as T;

  const error = payload.error ?? { code: "unknown", message: `حدث خطأ (${response.status}).` };
  // Session gone or password change pending: send the person where they need to be.
  if (response.status === 401 && !options.signIn) window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
  if (error.code === "password_change_required") window.location.href = "/admin/account?required=1";
  throw new ApiError(response.status, error.code, error.message, error.fieldErrors);
}
