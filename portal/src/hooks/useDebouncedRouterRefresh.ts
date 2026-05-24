'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const MIN_REFRESH_MS = 10000;

let lastGlobalRefresh = 0;
let globalRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export function useDebouncedRouterRefresh(minIntervalMs = MIN_REFRESH_MS) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    return () => {
      if (globalRefreshTimer) {
        clearTimeout(globalRefreshTimer);
        globalRefreshTimer = null;
      }
    };
  }, []);

  return useCallback(() => {
    const runRefresh = () => {
      lastGlobalRefresh = Date.now();
      globalRefreshTimer = null;
      routerRef.current.refresh();
    };

    const elapsed = Date.now() - lastGlobalRefresh;
    if (elapsed >= minIntervalMs) {
      runRefresh();
      return;
    }

    if (globalRefreshTimer) return;

    globalRefreshTimer = setTimeout(runRefresh, minIntervalMs - elapsed);
  }, [minIntervalMs]);
}
