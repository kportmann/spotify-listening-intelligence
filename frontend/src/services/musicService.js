import { http } from './http/client';

export const musicService = {
  getTopArtists(period = 'all_time', limit = 10, includeImages = false, refreshCache = false) {
    return http.get('/music/top/artists', {
      params: { period, limit, include_images: includeImages, refresh_cache: refreshCache },
      cacheTtlMs: 60000,
      bypassCache: refreshCache,
    });
  },

  getTopTracks(period = 'all_time', limit = 10, includeImages = false, refreshCache = false) {
    return http.get('/music/top/tracks', {
      params: { period, limit, include_images: includeImages, refresh_cache: refreshCache },
      cacheTtlMs: 60000,
      bypassCache: refreshCache,
    });
  },

  async getAllTopMusicContent(period = 'all_time', limit = 5, includeImages = true) {
    const [artists, tracks] = await Promise.all([
      this.getTopArtists(period, limit, includeImages),
      this.getTopTracks(period, limit, includeImages)
    ]);

    return { artists, tracks };
  },

  getTopArtistsWithImages(period = 'all_time', limit = 100, refreshCache = false) {
    return this.getTopArtists(period, limit, true, refreshCache);
  },

  getTopTracksWithImages(period = 'all_time', limit = 100, refreshCache = false) {
    return this.getTopTracks(period, limit, true, refreshCache);
  },

  getImagesBatch({ artists = null, tracks = null } = {}) {
    return http.post('/music/images/batch', {
      body: { artists, tracks },
    });
  }
};