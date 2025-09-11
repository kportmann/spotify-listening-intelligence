import { useMemo } from 'react';
import './FoundationSection.css';
import { useTopArtists } from '../../hooks/useTopContent';

export default function FoundationSection() {
  const { artists, loading, error: hookError } = useTopArtists('all_time', 6, true);
  const errorMessage = useMemo(() => (hookError ? 'Failed to load top artists' : null), [hookError]);

  return (
    <section className="wrapped-section">
      <div className="wrapped-section-content">
        <h2>The Foundation</h2>
        <p className="foundation-subtitle">Your core artists that built your taste over the years</p>
        {loading && <p>Loading…</p>}
        {errorMessage && <p>{errorMessage}</p>}
        {!loading && !errorMessage && (
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


