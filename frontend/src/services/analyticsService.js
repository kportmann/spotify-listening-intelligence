const API_BASE_URL = 'http://localhost:8000/api/v1';

export const analyticsService = {
  async getOverviewStats() {
    const response = await fetch(`${API_BASE_URL}/stats/overview`);
    if (!response.ok) {
      throw new Error('Failed to fetch overview stats');
    }
    return response.json();
  }
};