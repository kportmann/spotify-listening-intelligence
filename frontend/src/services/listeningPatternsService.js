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
};