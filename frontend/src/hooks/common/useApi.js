import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useApi(fetchFn, { params = [], enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!enabled) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (data == null || !isRefresh) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const result = await fetchFn({ signal: controller.signal });
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(e);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...params]);

  useEffect(() => {
    load(false);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return useMemo(() => ({ data, loading, refreshing, error, refetch }), [data, loading, refreshing, error, refetch]);
}
