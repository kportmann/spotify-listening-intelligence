import { http } from './http/client';

export const basicStatsService = {
  getStatsOverview(period = null) {
    const params = period && period !== 'all_time' ? { year: period } : undefined;
    return http.get('/basicStats/stats/overview', { params, cacheTtlMs: 60000 });
  },

  getAvailableYears() {
    return http.get('/basicStats/stats/available-years', { cacheTtlMs: 60000 });
  },

  getFirstPlay() {
    return http.get('/basicStats/stats/first-play');
  },
};