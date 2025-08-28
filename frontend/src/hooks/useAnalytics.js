import { useState, useEffect } from 'react';
import { basicStatsService } from '../services/basicStatsService';

export function useAnalytics(period = 'all_time') {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    basicStatsService.getStatsOverview(period)
      .then(setStats)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period]);

  return { stats, loading, error };
}