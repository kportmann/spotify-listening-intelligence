import { useApi } from './common/useApi';
import { musicService } from '../services/musicService';
import { podcastService } from '../services/podcastService';

export function useTopContent(period = 'all_time', limit = 5) {
  const { data, loading, refreshing, error, refetch } = useApi(
    async () => {
      const [musicData, podcastData] = await Promise.all([
        musicService.getAllTopMusicContent(period, limit),
        podcastService.getAllTopPodcastContent(period, limit)
      ]);
      return { ...musicData, ...podcastData };
    },
    { params: [period, limit] }
  );

  return { data, loading, refreshing, error, refetch };
}

export function useTopArtists(period = 'all_time', limit = 10, includeImages = false, refreshCache = false) {
  const { data, loading, refreshing, error, refetch } = useApi(
    () => musicService.getTopArtists(period, limit, includeImages, refreshCache),
    { params: [period, limit, includeImages, refreshCache] }
  );

  return { artists: data || [], loading, refreshing, error, refetch };
}

export function useTopTracks(period = 'all_time', limit = 10) {
  const { data, loading, refreshing, error, refetch } = useApi(
    () => musicService.getTopTracks(period, limit),
    { params: [period, limit] }
  );

  return { tracks: data || [], loading, refreshing, error, refetch };
}

export function useTopEpisodes(period = 'all_time', limit = 10) {
  const { data, loading, refreshing, error, refetch } = useApi(
    () => podcastService.getTopEpisodes(period, limit, true),
    { params: [period, limit] }
  );

  return { episodes: data || [], loading, refreshing, error, refetch };
}

export function useTopShows(period = 'all_time', limit = 10) {
  const { data, loading, refreshing, error, refetch } = useApi(
    () => podcastService.getTopShows(period, limit, true),
    { params: [period, limit] }
  );

  return { shows: data || [], loading, refreshing, error, refetch };
}

export function useTopAudiobooks(period = 'all_time', limit = 10) {
  const { data, loading, refreshing, error, refetch } = useApi(
    () => podcastService.getTopAudiobooks(period, limit),
    { params: [period, limit] }
  );

  return { audiobooks: data || [], loading, refreshing, error, refetch };
}