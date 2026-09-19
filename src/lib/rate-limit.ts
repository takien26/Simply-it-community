// ponytail: in-memory sliding window rate limiter; ceiling: single process only. Upgrade path: Redis for multi-instance cluster.

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale keys every 10 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60_000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 10 * 60_000).unref?.();
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { success: boolean; remaining: number } {
  const now = Date.now();
  let record = store.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  // Filter timestamps within window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    return { success: false, remaining: 0 };
  }

  record.timestamps.push(now);
  return { success: true, remaining: maxRequests - record.timestamps.length };
}
