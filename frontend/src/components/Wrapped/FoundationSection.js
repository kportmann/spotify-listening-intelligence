import { useEffect, useState } from 'react';
import './FoundationSection.css';
import { musicService } from '../../services/musicService';

export default function FoundationSection() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchTop = async () => {
      try {
        setError(null);
        const data = await musicService.getTopArtists('all_time', 6, true);
        if (!cancelled) setArtists(data || []);
      } catch (e) {
        if (!cancelled) setError('Failed to load top artists');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTop();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="wrapped-section">
      <div className="wrapped-section-content">
        <h2>The Foundation</h2>
        <p className="foundation-subtitle">Your core artists that built your taste</p>
        {loading && <p>Loading…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && (
          <div className="foundation-grid">
            {artists.slice(0, 6).map((a, idx) => (
              <div className="foundation-card" key={`${a.artist_name}-${idx}`} style={{ animationDelay: `${idx * 120}ms` }}>
                <div className="foundation-image">
                  {a.image_url && <img alt={a.artist_name} src={a.image_url} />}
                </div>
                <p className="foundation-name">{a.artist_name}</p>
              </div>
            ))}
          </div>
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


