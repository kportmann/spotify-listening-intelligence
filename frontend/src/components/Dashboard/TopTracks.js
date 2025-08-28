import { useState, useEffect } from 'react';
import { useTopContent } from '../../hooks/useTopContent';
import { topContentService } from '../../services/topContentService';
import TopContentList from './TopContentList';
import './TopTracks.css';

export default function TopTracks({ period = 'all_time', limit = 5 }) {
  const { data, loading, error } = useTopContent(period, limit);
  const [itemsWithImages, setItemsWithImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  // Load images for tracks
  useEffect(() => {
    if (!data?.tracks) return;

    const loadImagesForTracks = async () => {
      setLoadingImages(true);
      
      try {
        const tracksToLoad = data.tracks.slice(0, visibleCount);
        const imageData = await topContentService.getImagesForContent([], tracksToLoad);
        
        const updatedTracks = data.tracks.map(track => {
          const key = `${track.track_name}|${track.artist_name}`;
          return {
            ...track,
            image_url: imageData.track_images?.[key] || null
          };
        });
        
        setItemsWithImages(updatedTracks);
      } catch (error) {
        console.error('Failed to load track images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    loadImagesForTracks();
  }, [data, visibleCount]);

  const showMore = () => {
    if (data?.tracks) {
      setVisibleCount(Math.min(visibleCount + 10, data.tracks.length));
    }
  };

  const showLess = () => {
    setVisibleCount(3);
  };

  const canShowMore = data?.tracks && visibleCount < data.tracks.length;
  const canShowLess = visibleCount > 3;
  const hasImages = itemsWithImages.length > 0;

  if (loading) {
    return (
      <div className="top-tracks-section">
        <div className="top-tracks-loading">Loading your top tracks...</div>
      </div>
    );
  }

  if (error || !data?.tracks) {
    return (
      <div className="top-tracks-section">
        <div className="top-tracks-error">Unable to load tracks data</div>
      </div>
    );
  }

  // Use progressive data if available, otherwise fall back to basic data
  const displayData = hasImages ? itemsWithImages : data.tracks;

  return (
    <div className="top-tracks-section">
      <TopContentList 
        title="Top Tracks" 
        items={displayData} 
        type="tracks"
        loading={false}
        error={null}
        visibleCount={visibleCount}
        loadingImages={loadingImages}
      />
      
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