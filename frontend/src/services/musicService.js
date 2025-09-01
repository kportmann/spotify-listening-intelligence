const API_BASE_URL = 'http://localhost:8000/api/v1';

export const musicService = {
  async getTopArtists(period = 'all_time', limit = 10, includeImages = false, refreshCache = false) {
    const url = `${API_BASE_URL}/music/top/artists?period=${period}&limit=${limit}&include_images=${includeImages}&refresh_cache=${refreshCache}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch top artists');
    }
    return response.json();
  },

  async getTopTracks(period = 'all_time', limit = 10, includeImages = false, refreshCache = false) {
    const url = `${API_BASE_URL}/music/top/tracks?period=${period}&limit=${limit}&include_images=${includeImages}&refresh_cache=${refreshCache}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch top tracks');
    }
    return response.json();
  },

  async getAllTopMusicContent(period = 'all_time', limit = 5, includeImages = true) {
    const [artists, tracks] = await Promise.all([
      this.getTopArtists(period, limit, includeImages),
      this.getTopTracks(period, limit, includeImages)
    ]);

    return {
      artists,
      tracks
    };
  },

  async getTopArtistsWithImages(period = 'all_time', limit = 100, refreshCache = false) {
    return this.getTopArtists(period, limit, true, refreshCache);
  },

  async getTopTracksWithImages(period = 'all_time', limit = 100, refreshCache = false) {
    return this.getTopTracks(period, limit, true, refreshCache);
  }
};