import { http } from './http/client';

export const discoveryAndVarietyService = {
  getGeography(year = null) {
    const params = { ...(year ? { year } : {}) };
    return http.get('/discovery-and-variety/geography', { params, cacheTtlMs: 60000 });
  },
};