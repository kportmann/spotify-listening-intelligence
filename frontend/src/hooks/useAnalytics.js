import { useApi } from './common/useApi';
import { basicStatsService } from '../services/basicStatsService';

export function useAnalytics(period = 'all_time') {
  const { data, loading, refreshing, error, refetch } = useApi(
    () => basicStatsService.getStatsOverview(period),
    { params: [period] }
  );

  return { stats: data, loading, refreshing, error, refetch };
}