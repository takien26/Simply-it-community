const meCache = new Map<string, { timestamp: number; data: any }>();
export const ME_CACHE_TTL_MS = 2 * 1000; // 2s cache

export function getCachedMe(userId: string) {
  const cached = meCache.get(userId);
  if (cached && Date.now() - cached.timestamp < ME_CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

export function setCachedMe(userId: string, data: any) {
  meCache.set(userId, { timestamp: Date.now(), data });
}

export function clearMeCache(userId?: string) {
  if (userId) {
    meCache.delete(userId);
  } else {
    meCache.clear();
  }
}
