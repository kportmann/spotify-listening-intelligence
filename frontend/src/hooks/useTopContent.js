import { useState, useEffect } from 'react';
import { musicService } from '../services/musicService';
import { podcastService } from '../services/podcastService';

export function useTopContent(period = 'all_time', limit = 5) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      musicService.getAllTopMusicContent(period, limit),
      podcastService.getAllTopPodcastContent(period, limit)
    ])
      .then(([musicData, podcastData]) => {
        setData({
          ...musicData,
          ...podcastData
        });
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period, limit]);

  return { data, loading, error };
}

export function useTopArtists(period = 'all_time', limit = 10, includeImages = false, refreshCache = false) {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    musicService
      .getTopArtists(period, limit, includeImages, refreshCache)
      .then((data) => {
        if (!cancelled) setArtists(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, limit, includeImages, refreshCache]);

  return { artists, loading, error };
}

export function useTopTracks(period = 'all_time', limit = 10) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    musicService.getTopTracks(period, limit)
      .then(setTracks)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period, limit]);

  return { tracks, loading, error };
}

export function useTopEpisodes(period = 'all_time', limit = 10) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    podcastService.getTopEpisodes(period, limit, true)
      .then(setEpisodes)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period, limit]);

  return { episodes, loading, error };
}

export function useTopShows(period = 'all_time', limit = 10) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    podcastService.getTopShows(period, limit, true)
      .then(setShows)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period, limit]);

  return { shows, loading, error };
}

export function useTopAudiobooks(period = 'all_time', limit = 10) {
  const [audiobooks, setAudiobooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    podcastService.getTopAudiobooks(period, limit)
      .then(setAudiobooks)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period, limit]);

  return { audiobooks, loading, error };
}