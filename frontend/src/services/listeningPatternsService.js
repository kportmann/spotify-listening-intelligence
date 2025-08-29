const API_BASE_URL = 'http://localhost:8000/api/v1';

export const listeningPatternsService = {
  async getListeningHeatmap(year = null, timezone = 'UTC') {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (timezone !== 'UTC') params.append('timezone', timezone);
    
    const url = `${API_BASE_URL}/listening-patterns/listening-heatmap${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch listening heatmap data');
    }
    return response.json();
  },

  async getMonthlyTrends(year = null, timezone = 'UTC') {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (timezone !== 'UTC') params.append('timezone', timezone);
    
    const url = `${API_BASE_URL}/listening-patterns/monthly-trends${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch monthly trends data');
    }
    return response.json();
  },

  async getSeasonalTrends(year = null, timezone = 'UTC') {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (timezone !== 'UTC') params.append('timezone', timezone);
    
    const url = `${API_BASE_URL}/listening-patterns/seasonal-trends${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch seasonal trends data');
    }
    return response.json();
  },

  async getSkipRateAnalysis(year = null, timezone = 'UTC') {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    params.append('timezone', timezone);
    
    const url = `${API_BASE_URL}/listening-patterns/skip-rate-analysis${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch skip rate analysis data');
    }
    return response.json();
  },
};