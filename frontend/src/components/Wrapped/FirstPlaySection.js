import { useEffect, useState } from 'react';
import './FirstPlaySection.css';
import { basicStatsService } from '../../services/basicStatsService';
import { musicService } from '../../services/musicService';

export default function FirstPlaySection() {
  const [firstPlay, setFirstPlay] = useState(null);
  const [images, setImages] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchFirstPlay = async () => {
      try {
        const data = await basicStatsService.getFirstPlay();
        if (!cancelled) {
          setFirstPlay(data);
          if (data && data.artist_name && data.track_name) {
            const batch = await musicService.getImagesBatch({
              artists: [data.artist_name],
              tracks: [{ track_name: data.track_name, artist_name: data.artist_name }]
            });
            if (!cancelled) setImages(batch);
          }
        }
      } catch (e) {
        if (!cancelled) setFirstPlay(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchFirstPlay();
    return () => { cancelled = true; };
  }, []);

  const firstDate = firstPlay?.played_at ? new Date(firstPlay.played_at) : null;
  const firstDateFmt = firstDate ? firstDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  return (
    <section className="wrapped-section">
      <div className="wrapped-section-content">
        <h2>{firstDateFmt ? `It all began on ${firstDateFmt}` : 'Where it all began'}</h2>
        {loading && <p>Loading your first play…</p>}
        {!loading && firstPlay && firstPlay.track_name && firstPlay.artist_name && firstDateFmt && (
          <div className="first-play-card vertical">
            <div className="first-play-stack">
              <div className="first-play-image">
                {images?.artist_images && images.artist_images[firstPlay.artist_name] && (
                  <img
                    alt={`Artist ${firstPlay.artist_name}`}
                    src={images.artist_images[firstPlay.artist_name]}
                  />
                )}
                <span className="first-play-label">Artist</span>
              </div>
              <div className="first-play-image">
                {images?.track_images && images.track_images[`${firstPlay.track_name}|${firstPlay.artist_name}`] && (
                  <img
                    alt={`Album art for ${firstPlay.track_name}`}
                    src={images.track_images[`${firstPlay.track_name}|${firstPlay.artist_name}`]}
                  />
                )}
                <span className="first-play-label">Track</span>
              </div>
            </div>
            <div className="first-play-meta">
              <p className="first-play-story">
                You pressed play on “{firstPlay.track_name}” by {firstPlay.artist_name}.<br />
                That first listen kicked off your streaming journey.
              </p>
            </div>
          </div>
        )}
        {!loading && (!firstPlay || !firstPlay.played_at) && (
          <p>We couldn't find your first play yet.</p>
        )}
      </div>
      <div className="wrapped-scroll-indicator" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </section>
  );
}


