import { http } from './http/client';

export const podcastService = {
  getTopEpisodes(period = 'all_time', limit = 10, includeImages = false) {
    return http.get('/podcasts/top/episodes', {
      params: { period, limit, include_images: includeImages },
      cacheTtlMs: 60000,
    });
  },

  getTopShows(period = 'all_time', limit = 10, includeImages = false) {
    return http.get('/podcasts/top/shows', {
      params: { period, limit, include_images: includeImages },
      cacheTtlMs: 60000,
    });
  },

  getTopAudiobooks(period = 'all_time', limit = 10) {
    return http.get('/podcasts/top/audiobooks', {
      params: { period, limit },
      cacheTtlMs: 60000,
    });
  },

  getImagesForPodcasts(episodes = [], shows = []) {
    return http.post('/podcasts/images/batch', {
      body: {
        episodes: episodes.map(episode => ({
          episode_name: episode.episode_name,
          show_name: episode.show_name,
        })),
        shows,
      },
    });
  },

  async getAllTopPodcastContent(period = 'all_time', limit = 5, includeImages = true) {
    const [episodes, shows, audiobooks] = await Promise.all([
      this.getTopEpisodes(period, limit, includeImages),
      this.getTopShows(period, limit, includeImages),
      this.getTopAudiobooks(period, limit),
    ]);

    return { episodes, shows, audiobooks };
  },
};