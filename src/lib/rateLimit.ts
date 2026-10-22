// Minimal in-memory sliding-window rate limiter keyed by client IP.
// Production note: replace with Redis for multi-instance deployments.
type Bucket = { count: number; resetAt: number };

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs: number;
  private readonly max: number;

  constructor(windowMs: number, max: number) {
    this.windowMs = windowMs;
    this.max = max;
  }

  check(key: string): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSec: 0 };
    }
    if (bucket.count >= this.max) {
      return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    bucket.count += 1;
    return { allowed: true, retryAfterSec: 0 };
  }

  // Periodic cleanup to bound memory.
  sweep(): void {
    const now = Date.now();
    for (const [key, b] of this.buckets) if (now >= b.resetAt) this.buckets.delete(key);
  }
}
