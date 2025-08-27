import { useTopContent } from '../../hooks/useTopContent';
import { useProgressiveImages } from '../../hooks/useProgressiveImages';
import TopContentList from './TopContentList';
import './TopMusic.css';

export default function TopMusic({ period = 'all_time', limit = 5 }) {
  const { data, loading, error } = useTopContent(period, limit);
  const { 
    itemsWithImages, 
    loadingImages, 
    visibleCount,
    showMore,
    showLess,
    canShowMore,
    canShowLess,
    hasImages 
  } = useProgressiveImages(data, 3);

  if (loading) {
    return (
      <div className="top-music-section">
        <h2 className="top-music-header">Your Top Music</h2>
        <div className="top-music-loading">Loading your music data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="top-music-section">
        <h2 className="top-music-header">Your Top Music</h2>
        <div className="top-music-error">Unable to load music data</div>
      </div>
    );
  }

  // Use progressive data if available, otherwise fall back to basic data
  const displayData = hasImages ? itemsWithImages : data;

  return (
    <div className="top-music-section">
      <h2 className="top-music-header">Your Top Music</h2>
      <div className="top-music-grid">
        <TopContentList 
          title="Top Artists" 
          items={displayData.artists} 
          type="artists"
          loading={false}
          error={null}
          visibleCount={visibleCount}
          loadingImages={loadingImages}
        />
        
        <TopContentList 
          title="Top Tracks" 
          items={displayData.tracks} 
          type="tracks"
          loading={false}
          error={null}
          visibleCount={visibleCount}
          loadingImages={loadingImages}
        />
      </div>
      
      {(canShowMore || canShowLess) && (
        <div className="show-more-section">
          {canShowMore && (
            <button 
              onClick={showMore} 
              className="show-more-btn"
              disabled={loadingImages}
            >
              {loadingImages ? 'Loading images...' : 'Show More'}
            </button>
          )}
          {canShowLess && (
            <button 
              onClick={showLess} 
              className="show-less-btn"
              disabled={loadingImages}
            >
              Show Less
            </button>
          )}
        </div>
      )}
    </div>
  );
}