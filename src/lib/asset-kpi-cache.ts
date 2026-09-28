export interface KpiCacheEntry {
  totalOriginalPrice: number;
  totalDepreciation: number;
  remainingValue: number;
  depreciationPercent: number;
  categoryCountsMap: Record<string, number>;
  pendingCount: number;
  availableCount: number;
  inUseCount: number;
  maintenanceCount: number;
  timestamp: number;
}

export const assetKpiCache = new Map<string, KpiCacheEntry>();
export const MAX_KPI_CACHE_SIZE = 50;
export const KPI_CACHE_TTL_MS = 60 * 1000;

export function invalidateAssetKpiCache() {
  assetKpiCache.clear();
}
