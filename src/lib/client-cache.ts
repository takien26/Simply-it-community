'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
  maxAgeMs: number = 30000, // 30 seconds default cache TTL
  forceFresh: boolean = false
): Promise<T> {
  // 1. Check if cached data exists (bypassed if forceFresh)
  const cached = forceFresh ? undefined : memoryCache.get(url);
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

const REFRESH_EVENT_NAME = 'app:data-refresh';
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('app_data_sync_channel');
    broadcastChannel.onmessage = (event) => {
      if (event?.data?.type === 'REFRESH') {
        invalidateClientCache(event.data.scope);
        window.dispatchEvent(
          new CustomEvent(REFRESH_EVENT_NAME, { detail: { scope: event.data.scope } })
        );
      }
    };
  } catch {}
}

/**
 * Triggers instant background revalidation for the active page and any other open tabs
 */
export function triggerDataRefresh(scope?: string) {
  invalidateClientCache(scope);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(REFRESH_EVENT_NAME, { detail: { scope } })
    );

    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'REFRESH', scope });
      } catch {}
    }
  }
}

/**
 * Subscribes to global data refresh events (from mutations, modals, or other tabs)
 */
export function subscribeDataRefresh(callback: (scope?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    callback(customEvent.detail?.scope);
  };

  window.addEventListener(REFRESH_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(REFRESH_EVENT_NAME, handler);
  };
}

export interface UseAutoRefreshOptions {
  onRefresh: (forceFresh?: boolean) => void | Promise<void>;
  scope?: string;
  defaultIntervalSec?: number;
  enableFocusRevalidation?: boolean;
}

/**
 * Professional Auto-Refresh & Instant Reactive Sync Hook (Like Jira, Linear, AWS Console)
 * 1. Immediate Mutation Invalidation via event bus & BroadcastChannel (50 - 100ms)
 * 2. Focus Revalidation when switching back to tab
 * 3. Smart Background Polling (zero waste: ONLY runs when tab is active/visible)
 */
export function useAutoRefresh({
  onRefresh,
  scope,
  defaultIntervalSec = 60,
  enableFocusRevalidation = true,
}: UseAutoRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [intervalSec, setIntervalSecState] = useState<number>(defaultIntervalSec);

  const lastFetchTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Sync preference from localStorage
  useEffect(() => {
    isMountedRef.current = true;
    try {
      const saved = localStorage.getItem('app:auto-refresh-interval');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) setIntervalSecState(val);
      }
    } catch {}

    const handleConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof customEvent.detail?.intervalSec === 'number') {
        setIntervalSecState(customEvent.detail.intervalSec);
      }
    };
    window.addEventListener('app:auto-refresh-config-changed', handleConfigChange);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('app:auto-refresh-config-changed', handleConfigChange);
    };
  }, []);

  const setIntervalSec = useCallback((sec: number) => {
    setIntervalSecState(sec);
    try {
      localStorage.setItem('app:auto-refresh-interval', String(sec));
      window.dispatchEvent(
        new CustomEvent('app:auto-refresh-config-changed', { detail: { intervalSec: sec } })
      );
    } catch {}
  }, []);

  const executeRefresh = useCallback(async (forceFresh = true) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    lastFetchTimeRef.current = Date.now();
    try {
      await onRefreshRef.current(forceFresh);
      if (isMountedRef.current) {
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.warn('Auto refresh error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing]);

  // 1. Instant Reactive Sync (Mutations, Modals, other browser tabs)
  useEffect(() => {
    const unsubscribe = subscribeDataRefresh((targetScope) => {
      if (!targetScope || !scope || targetScope === scope || targetScope.startsWith(scope) || scope.startsWith(targetScope)) {
        executeRefresh(true);
      }
    });

    const handleRealtime = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      if (data?.type && (data.type === 'DATA_UPDATED' || !scope || String(data.type).toLowerCase().includes(scope.toLowerCase()))) {
        executeRefresh(true);
      }
    };
    window.addEventListener('app:realtime-event', handleRealtime);

    return () => {
      unsubscribe();
      window.removeEventListener('app:realtime-event', handleRealtime);
    };
  }, [scope, executeRefresh]);

  // 2. Focus Revalidation (when tab gains focus or becomes visible)
  useEffect(() => {
    if (!enableFocusRevalidation) return;

    const handleFocus = () => {
      const elapsed = Date.now() - lastFetchTimeRef.current;
      if (elapsed > 15000 && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        executeRefresh(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [enableFocusRevalidation, executeRefresh]);

  // 3. Smart Background Polling (ONLY when visible)
  useEffect(() => {
    if (intervalSec <= 0) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        executeRefresh(false);
      }
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [intervalSec, executeRefresh]);

  return {
    isRefreshing,
    lastRefreshedAt,
    refreshNow: () => executeRefresh(true),
    intervalSec,
    setIntervalSec,
  };
}
