/**
 * Small in-memory sliding-window rate limiter for route handlers.
 *
 * Best effort: each serverless instance keeps its own counts, so it stops one client hammering an instance,
 * not a distributed attack. Pair it with a Vercel Firewall rate-limit rule for that (see web/README.md).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private limit: number,
    private windowMs: number,
    private maxKeys = 5000,
  ) {}

  /** Returns 0 if allowed, otherwise seconds until the client may retry. */
  check(key: string, now = Date.now()): number {
    const start = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > start);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((recent[0] + this.windowMs - now) / 1000));
    }
    recent.push(now);
    this.hits.delete(key); // re-insert to keep Map order = recency, so pruning drops the stalest keys
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) {
      for (const k of this.hits.keys()) {
        this.hits.delete(k);
        if (this.hits.size <= this.maxKeys) break;
      }
    }
    return 0;
  }
}

/** Client IP as reported by the platform proxy (Vercel sets x-forwarded-for / x-real-ip). */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}
