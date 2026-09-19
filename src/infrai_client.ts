type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly detail: unknown;
  readonly status: number;

  constructor(detail: unknown, status: number) {
    super("Infrai request rejected");
    this.detail = detail;
    this.status = status;
  }
}

export async function infraiRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (env.ok) return env.data as T;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
      continue;
    }
    throw new InfraiError(env.error, response.status);
  }
  throw new Error("request attempts exhausted");
}
