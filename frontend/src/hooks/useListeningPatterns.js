import { useEffect, useState } from 'react';
import { listeningPatternsService } from '../services/listeningPatternsService';

export function useListeningHeatmap(selectedYear = null, timezone = 'UTC') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listeningPatternsService.getListeningHeatmap(selectedYear, timezone);
        if (!isCancelled) setData(response);
      } catch (err) {
        if (!isCancelled) setError(err.message || 'Failed to load heatmap');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [selectedYear, timezone]);

  return { data, loading, error };
}

export function useMonthlyTrends(selectedYear = null, timezone = 'UTC') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listeningPatternsService.getMonthlyTrends(selectedYear, timezone);
        if (!isCancelled) setData(response);
      } catch (err) {
        if (!isCancelled) setError(err.message || 'Failed to load monthly trends');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [selectedYear, timezone]);

  return { data, loading, error };
}

export function useSeasonalTrends(selectedYear = null, timezone = 'UTC') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listeningPatternsService.getSeasonalTrends(selectedYear, timezone);
        if (!isCancelled) setData(response);
      } catch (err) {
        if (!isCancelled) setError(err.message || 'Failed to load seasonal trends');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [selectedYear, timezone]);

  return { data, loading, error };
}

export function useSeasonalTopContent(season, selectedYear = null, includeImages = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!season) return;
    let isCancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listeningPatternsService.getSeasonalTopContent(season, selectedYear, includeImages);
        if (!isCancelled) setData(response);
      } catch (err) {
        if (!isCancelled) setError(err.message || 'Failed to load seasonal top content');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [season, selectedYear, includeImages]);

  return { data, loading, error };
}


