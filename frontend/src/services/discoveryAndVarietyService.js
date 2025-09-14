import { http } from './http/client';

export const discoveryAndVarietyService = {
  getGeography(year = null) {
    const params = { ...(year ? { year } : {}) };
    return http.get('/discovery-and-variety/worldmap', { params, cacheTtlMs: 60000 });
  },
};

export const topGenresService = {
  getTopGenres({ year = null, limit = 25, weighting = 'even' } = {}) {
    const params = {
      ...(year ? { year } : {}),
      ...(limit ? { limit } : {}),
      ...(weighting ? { weighting } : {}),
    };
    return http.get('/discovery-and-variety/topGenres', { params, cacheTtlMs: 60000 });
  },
};