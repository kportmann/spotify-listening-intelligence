import { useApi } from './common/useApi';
import { basicStatsService } from '../services/basicStatsService';
import { musicService } from '../services/musicService';

export function useFirstPlay() {
  const { data, loading, refreshing, error, refetch } = useApi(
    async () => {
      const fp = await basicStatsService.getFirstPlay();
      if (fp && fp.artist_name && fp.track_name) {
        const batch = await musicService.getImagesBatch({
          artists: [fp.artist_name],
          tracks: [{ track_name: fp.track_name, artist_name: fp.artist_name }]
        });
        return { firstPlay: fp, images: batch };
      }
      return { firstPlay: fp, images: null };
    },
    { params: [] }
  );

  return { firstPlay: data?.firstPlay ?? null, images: data?.images ?? null, loading, refreshing, error, refetch };
}


