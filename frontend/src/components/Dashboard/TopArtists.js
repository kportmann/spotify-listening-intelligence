import { useState, useMemo } from 'react';
import { useTopArtists } from '../../hooks';
import TopContentCarousel from './TopContentCarousel';
import ExpandableTopList from './ExpandableTopList';
import ExpandButton from '../common/ExpandButton/ExpandButton';
import './TopArtists.css';

export default function TopArtists({ period = 'all_time', limit = 100 }) {
  const [showExpanded, setShowExpanded] = useState(false);
  const [retryOnce, setRetryOnce] = useState(false);

  const { artists, loading, refreshing, error, refetch } = useTopArtists(period, limit, true, retryOnce);

  // Compute success rate and trigger one-time retry with cache refresh if low
  useMemo(() => {
    if (!loading && !refreshing && !error && artists?.length) {
      const total = artists.length;
      const withImages = artists.filter(a => a.image_url).length;
      const successRate = (withImages / total) * 100;
      if (successRate < 60 && !retryOnce) {
        setRetryOnce(true);
        refetch();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, refreshing, error, artists]);

  const toggleExpanded = () => setShowExpanded(!showExpanded);

  if (loading && !artists.length) {
    return (
      <div className="top-artists-section">
        <div className="top-artists-loading">Loading your top artists...</div>
      </div>
    );
  }

  if (error || !artists.length) {
    return (
      <div className="top-artists-section">
        <div className="top-artists-error">Unable to load artists data</div>
      </div>
    );
  }

  return (
    <div className="top-artists-section">
      {!showExpanded ? (
        <>
          <TopContentCarousel 
            items={artists}
            type="artists"
            title="Top Artists"
          />
          <ExpandButton 
            isExpanded={false}
            onClick={toggleExpanded}
            isLoading={refreshing}
          />
        </>
      ) : (
        <>
          <ExpandableTopList
            items={artists}
            type="artists"
            title="All Top Artists"
            loadingImages={refreshing}
          />
          <ExpandButton 
            isExpanded={true}
            onClick={toggleExpanded}
          />
        </>
      )}
    </div>
  );
}