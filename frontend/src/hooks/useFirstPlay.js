import { useEffect, useState } from 'react';
import { basicStatsService } from '../services/basicStatsService';
import { musicService } from '../services/musicService';

export function useFirstPlay() {
  const [firstPlay, setFirstPlay] = useState(null);
  const [images, setImages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFirstPlay = async () => {
      try {
        setError(null);
        const data = await basicStatsService.getFirstPlay();
        if (cancelled) return;
        setFirstPlay(data);

        if (data && data.artist_name && data.track_name) {
          const batch = await musicService.getImagesBatch({
            artists: [data.artist_name],
            tracks: [{ track_name: data.track_name, artist_name: data.artist_name }]
          });
          if (!cancelled) setImages(batch);
        } else if (!cancelled) {
          setImages(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setFirstPlay(null);
          setImages(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFirstPlay();
    return () => { cancelled = true; };
  }, []);

  return { firstPlay, images, loading, error };
}


