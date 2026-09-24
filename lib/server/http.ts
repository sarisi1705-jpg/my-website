import type { ZodError } from "zod";

// Every API response is either { data } or { error: { code, message, fieldErrors? } }.

export function jsonData<T>(data: T, status = 200, headers?: HeadersInit): Response {
  return Response.json({ data }, { status, headers });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: { fieldErrors?: Record<string, string>; headers?: HeadersInit },
): Response {
  return Response.json(
    { error: { code, message, ...(extra?.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}) } },
    { status, headers: extra?.headers },
  );
}

/** First message per field, keyed by the field name without its parent prefix. */
export function fieldErrorsFrom(error: ZodError, stripPrefix?: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = stripPrefix && issue.path[0] === stripPrefix ? issue.path.slice(1) : issue.path;
    const key = path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}

/** Parses a JSON body, rejecting bodies larger than maxBytes. Returns undefined when invalid. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown | undefined> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return undefined;
  const text = await request.text();
  if (text.length > maxBytes) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
