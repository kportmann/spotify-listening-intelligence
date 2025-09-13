import { http } from './http/client';

export const listeningPatternsService = {
  getListeningHeatmap(year = null, timezone = 'UTC') {
    const params = {
      ...(year ? { year } : {}),
      ...(timezone !== 'UTC' ? { timezone } : {}),
    };
    return http.get('/listening-patterns/listening-heatmap', { params, cacheTtlMs: 60000 });
  },

  getMonthlyTrends(year = null, timezone = 'UTC') {
    const params = {
      ...(year ? { year } : {}),
      ...(timezone !== 'UTC' ? { timezone } : {}),
    };
    return http.get('/listening-patterns/monthly-trends', { params, cacheTtlMs: 60000 });
  },

  getSeasonalTrends(year = null, timezone = 'UTC') {
    const params = {
      ...(year ? { year } : {}),
      ...(timezone !== 'UTC' ? { timezone } : {}),
    };
    return http.get('/listening-patterns/seasonal-trends', { params, cacheTtlMs: 60000 });
  },

  getSeasonalTopContent(season, year = null, includeImages = true) {
    const params = { season, ...(year ? { year } : {}), ...(includeImages ? { include_images: true } : {}) };
    return http.get('/listening-patterns/seasonal-top-content', { params, cacheTtlMs: 60000 });
  },

};