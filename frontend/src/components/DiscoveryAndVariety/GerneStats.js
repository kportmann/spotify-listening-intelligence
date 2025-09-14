import React, { useState } from 'react';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import SectionDescription from '../common/SectionDescription/SectionDescription';
import { useTopGenres } from '../../hooks';
import './GerneStats.css';
import RadarChart from './RadarChart';
import ExpandButton from '../common/ExpandButton/ExpandButton';
import ExpandableTopGenreList from './ExpandableTopGenreList';

export default function GerneStats({ year = null }) {
  const [weighting, setWeighting] = useState('even');
  const [showExpanded, setShowExpanded] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState(40); // 10 | 40 | 100

  const { data, loading, error } = useTopGenres({ year, limit: showExpanded ? selectedLimit : 10, weighting });

  const items = data?.genres || [];
  const totalDistinct = data?.total_distinct_genres ?? null;
  const top6 = items.slice(0, 6);
  const top6Coverage = top6.reduce((sum, g) => sum + (g.share_pct || 0), 0);
  const radarData = top6.map((g) => ({ label: g.genre, value: g.share_pct || 0 }));

  return (
    <section className="gs-section">
      <SectionTitle title="Top Genres" />
      <SectionDescription>
        Your top genres by listening time{year ? ` in ${year}` : ''}. Percentages are out of your total music listening time.
        {typeof totalDistinct === 'number' && (
          <> You listened across <strong>{totalDistinct}</strong> distinct genres{year ? ` in ${year}` : ''}.</>
        )}
        {' '}The spiderweb shows your top 6 genres. Together they account for <strong>{top6Coverage.toFixed(1)}%</strong> of your total listening; each spoke’s length is proportional to that genre’s overall share.
        Use Even weighting to split artists’ time evenly across their genres, or Full to attribute full time to each listed genre.
      </SectionDescription>

      <div className="gs-scale-toggle" role="group" aria-label="Genre weighting">
        <button
          type="button"
          className={weighting === 'even' ? 'gs-toggle active' : 'gs-toggle'}
          onClick={() => setWeighting('even')}
        >
          Even
        </button>
        <button
          type="button"
          className={weighting === 'full' ? 'gs-toggle active' : 'gs-toggle'}
          onClick={() => setWeighting('full')}
        >
          Full
        </button>
      </div>
      
      {loading && <div className="gs-loading">Loading genres…</div>}
      {!loading && !error && items.length > 0 && (
        <RadarChart data={radarData} />
      )}
      {error && !loading && (
        <div className="gs-error">Could not load top genres.</div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="gs-empty">No genres to display.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <ExpandButton 
          isExpanded={showExpanded}
          onClick={() => setShowExpanded(!showExpanded)}
          isLoading={loading}
        />
      )}

      {!loading && !error && items.length > 0 && showExpanded && (
        <ExpandableTopGenreList items={items} totalDistinct={totalDistinct} />
      )}
    </section>
  );
}