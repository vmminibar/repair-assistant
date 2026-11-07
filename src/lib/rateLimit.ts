// Simple in-memory limiter. Works for a single Node process (typical on Hostinger).
// If you run several instances, swap this for a shared store.
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

export function rateLimited(key: string): boolean {
  const limit = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 10);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= 60_000)) hits.delete(k);
  }
  return false;
}
