/**
 * In-memory Client-side SWR (Stale-While-Revalidate) Cache Store
 * Allows instant 0ms page transitions while syncing fresh data in the background.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export async function fetchWithSwr<T>(
  url: string,
  onData: (data: T, fromCache: boolean) => void,
  maxAgeMs: number = 30000 // 30 seconds default cache TTL
): Promise<T> {
  // 1. Check if cached data exists
  const cached = memoryCache.get(url);
  const now = Date.now();

  if (cached) {
    // Return stale data immediately for 0ms transition
    onData(cached.data, true);

    // If cache is fresh, skip background revalidation
    if (now - cached.timestamp < maxAgeMs) {
      return cached.data;
    }
  }

  // 2. Fetch fresh data from network in background / foreground
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    const freshData = await res.json();

    // Store in cache
    memoryCache.set(url, {
      data: freshData,
      timestamp: Date.now(),
    });

    // Notify caller with fresh data
    onData(freshData, false);
    return freshData;
  } catch (err) {
    if (cached) {
      // If network fails but we have stale cache, keep stale
      return cached.data;
    }
    throw err;
  }
}

export function invalidateClientCache(urlPrefix?: string) {
  if (!urlPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      memoryCache.delete(key);
    }
  }
}
