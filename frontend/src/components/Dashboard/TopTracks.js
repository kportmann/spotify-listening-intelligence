import { useState, useMemo } from 'react';
import { useTopTracks } from '../../hooks';
import TopContentCarousel from './TopContentCarousel';
import ExpandableTopList from './ExpandableTopList';
import ExpandButton from '../common/ExpandButton/ExpandButton';
import './TopTracks.css';

export default function TopTracks({ period = 'all_time', limit = 100 }) {
  const [showExpanded, setShowExpanded] = useState(false);
  const [retryOnce, setRetryOnce] = useState(false);

  const { tracks, loading, refreshing, error, refetch } = useTopTracks(period, limit, true, retryOnce);

  // Compute success rate and trigger one-time retry with cache refresh if low
  useMemo(() => {
    if (!loading && !refreshing && !error && tracks?.length) {
      const total = tracks.length;
      const withImages = tracks.filter(t => t.image_url).length;
      const successRate = (withImages / total) * 100;
      if (successRate < 60 && !retryOnce) {
        setRetryOnce(true);
        refetch();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, refreshing, error, tracks]);

  const toggleExpanded = () => setShowExpanded(!showExpanded);

  if (loading && !tracks.length) {
    return (
      <div className="top-tracks-section">
        <div className="top-tracks-loading">Loading your top tracks...</div>
      </div>
    );
  }

  if (error || !tracks.length) {
    return (
      <div className="top-tracks-section">
        <div className="top-tracks-error">Unable to load tracks data</div>
      </div>
    );
  }

  return (
    <div className="top-tracks-section">
      {!showExpanded ? (
        <>
          <TopContentCarousel 
            items={tracks}
            type="tracks"
            title="Top Tracks"
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
            items={tracks}
            type="tracks"
            title="All Top Tracks"
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