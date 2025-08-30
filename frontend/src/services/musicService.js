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

  async getImagesForContent(artists = [], tracks = []) {
    const response = await fetch(`${API_BASE_URL}/music/images/batch`, {
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