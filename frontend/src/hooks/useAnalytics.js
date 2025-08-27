import { useState, useEffect } from 'react';
import { basicStatsService } from '../services/basicStatsService';

export function useAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    basicStatsService.getStatsOverview()
      .then(setStats)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}