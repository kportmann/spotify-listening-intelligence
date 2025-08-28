const API_BASE_URL = 'http://localhost:8000/api/v1';

export const podcastService = {
  async getTopEpisodes(period = 'all_time', limit = 10, includeImages = false) {
    const response = await fetch(`${API_BASE_URL}/podcasts/top/episodes?period=${period}&limit=${limit}&include_images=${includeImages}`);
    if (!response.ok) {
      throw new Error('Failed to fetch top episodes');
    }
    return response.json();
  },

  async getTopShows(period = 'all_time', limit = 10, includeImages = false) {
    const response = await fetch(`${API_BASE_URL}/podcasts/top/shows?period=${period}&limit=${limit}&include_images=${includeImages}`);
    if (!response.ok) {
      throw new Error('Failed to fetch top shows');
    }
    return response.json();
  },

  async getTopAudiobooks(period = 'all_time', limit = 10) {
    const response = await fetch(`${API_BASE_URL}/podcasts/top/audiobooks?period=${period}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch top audiobooks');
    }
    return response.json();
  },

  async getImagesForPodcasts(episodes = [], shows = []) {
    const response = await fetch(`${API_BASE_URL}/podcasts/images/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        episodes: episodes.map(episode => ({
          episode_name: episode.episode_name,
          show_name: episode.show_name
        })),
        shows
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch podcast images');
    }
    return response.json();
  },

  async getAllTopPodcastContent(period = 'all_time', limit = 5, includeImages = true) {
    const [episodes, shows, audiobooks] = await Promise.all([
      this.getTopEpisodes(period, limit, includeImages),
      this.getTopShows(period, limit, includeImages),
      this.getTopAudiobooks(period, limit)
    ]);

    return {
      episodes,
      shows,
      audiobooks
    };
  }
};