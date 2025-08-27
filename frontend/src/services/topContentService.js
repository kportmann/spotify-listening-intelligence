const API_BASE_URL = 'http://localhost:8000/api/v1';

export const topContentService = {
  async getTopArtists(period = 'all_time', limit = 10, includeImages = false) {
    const response = await fetch(`${API_BASE_URL}/topContent/top/artists?period=${period}&limit=${limit}&include_images=${includeImages}`);
    if (!response.ok) {
      throw new Error('Failed to fetch top artists');
    }
    return response.json();
  },

  async getTopTracks(period = 'all_time', limit = 10, includeImages = false) {
    const response = await fetch(`${API_BASE_URL}/topContent/top/tracks?period=${period}&limit=${limit}&include_images=${includeImages}`);
    if (!response.ok) {
      throw new Error('Failed to fetch top tracks');
    }
    return response.json();
  },

  async getImagesForContent(artists = [], tracks = []) {
    const response = await fetch(`${API_BASE_URL}/topContent/images/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        artists,
        tracks: tracks.map(track => ({
          track_name: track.track_name,
          artist_name: track.artist_name
        }))
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch images');
    }
    return response.json();
  },

  async getTopEpisodes(period = 'all_time', limit = 10) {
    const response = await fetch(`${API_BASE_URL}/topContent/top/episodes?period=${period}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch top episodes');
    }
    return response.json();
  },

  async getTopShows(period = 'all_time', limit = 10) {
    const response = await fetch(`${API_BASE_URL}/topContent/top/shows?period=${period}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch top shows');
    }
    return response.json();
  },

  async getTopAudiobooks(period = 'all_time', limit = 10) {
    const response = await fetch(`${API_BASE_URL}/topContent/top/audiobooks?period=${period}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch top audiobooks');
    }
    return response.json();
  },

  async getAllTopContent(period = 'all_time', limit = 5) {
    const [artists, tracks, episodes, shows, audiobooks] = await Promise.all([
      this.getTopArtists(period, limit),
      this.getTopTracks(period, limit),
      this.getTopEpisodes(period, limit),
      this.getTopShows(period, limit),
      this.getTopAudiobooks(period, limit)
    ]);

    return {
      artists,
      tracks,
      episodes,
      shows,
      audiobooks
    };
  }
};