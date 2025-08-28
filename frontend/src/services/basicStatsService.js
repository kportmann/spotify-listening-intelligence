const API_BASE_URL = 'http://localhost:8000/api/v1';

export const basicStatsService = {
  async getStatsOverview(period = null) {
    const url = period && period !== 'all_time' 
      ? `${API_BASE_URL}/basicStats/stats/overview?year=${period}`
      : `${API_BASE_URL}/basicStats/stats/overview`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch stats overview');
    }
    return response.json();
  },

  async getAvailableYears() {
    const response = await fetch(`${API_BASE_URL}/basicStats/stats/available-years`);
    if (!response.ok) {
      throw new Error('Failed to fetch available years');
    }
    return response.json();
  },
};