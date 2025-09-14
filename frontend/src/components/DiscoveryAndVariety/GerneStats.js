import SectionTitle from '../common/SectionTitle/SectionTitle';
import SectionDescription from '../common/SectionDescription/SectionDescription';
import { useTopGenres } from '../../hooks';
import './GerneStats.css';

export default function GerneStats({ year = null }) {
  const { data, loading, error } = useTopGenres({ year, limit: 20, weighting: 'even' });

  const items = data?.genres || [];

  return (
    <section className="gs-section">
      <SectionTitle title="Top Genres" />
      <SectionDescription>
        Your top genres by listening time{year ? ` in ${year}` : ''}. Percentages are out of your total music listening time.
      </SectionDescription>

      {loading && <div className="gs-loading">Loading genres…</div>}
      {error && !loading && (
        <div className="gs-error">Could not load top genres.</div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="gs-empty">No genres to display.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="gs-list">
          {items.map((g) => (
            <li key={g.genre} className="gs-item">
              <div className="gs-row">
                <div className="gs-genre">{g.genre}</div>
                <div className="gs-share">{g.share_pct?.toFixed(1)}%</div>
              </div>
              <div className="gs-bar">
                <div
                  className="gs-bar-fill"
                  style={{ width: `${Math.min(100, g.share_pct || 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}