const API_BASE_URL = 'http://localhost:8000/api/v1';

export const analyticsService = {
  async getStatsOverview() {
    const response = await fetch(`${API_BASE_URL}/analytics/stats/overview`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats overview');
    }
    return response.json();
  },
};