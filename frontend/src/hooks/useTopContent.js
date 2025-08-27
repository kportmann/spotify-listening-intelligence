import { useState, useEffect } from 'react';
import { topContentService } from '../services/topContentService';

export function useTopContent(period = 'all_time', limit = 5) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    topContentService.getAllTopContent(period, limit)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period, limit]);

  return { data, loading, error };
}

export function useTopArtists(period = 'all_time', limit = 10) {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    topContentService.getTopArtists(period, limit)
      .then(setArtists)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period, limit]);

  return { artists, loading, error };
}

export function useTopTracks(period = 'all_time', limit = 10) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    topContentService.getTopTracks(period, limit)
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
    topContentService.getTopEpisodes(period, limit)
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
    topContentService.getTopShows(period, limit)
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
    topContentService.getTopAudiobooks(period, limit)
      .then(setAudiobooks)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period, limit]);

  return { audiobooks, loading, error };
}