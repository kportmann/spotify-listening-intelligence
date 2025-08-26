const API_BASE_URL = 'http://localhost:8000/api/v1';

export const analyticsService = {
  async get_total_listening_time() {
    const response = await fetch(`${API_BASE_URL}/analytics/stats/totalTime`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    return response.json();
  }
};