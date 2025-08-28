import { useState, useEffect } from 'react';
import { useTopContent } from '../../hooks/useTopContent';
import { topContentService } from '../../services/topContentService';
import TopContentList from './TopContentList';
import './TopArtists.css';

export default function TopArtists({ period = 'all_time', limit = 5 }) {
  const { data, loading, error } = useTopContent(period, limit);
  const [itemsWithImages, setItemsWithImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  // Load images for artists
  useEffect(() => {
    if (!data?.artists) return;

    const loadImagesForArtists = async () => {
      setLoadingImages(true);
      
      try {
        const artistsToLoad = data.artists.slice(0, visibleCount).map(a => a.artist_name);
        const imageData = await topContentService.getImagesForContent(artistsToLoad, []);
        
        const updatedArtists = data.artists.map(artist => ({
          ...artist,
          image_url: imageData.artist_images?.[artist.artist_name] || null
        }));
        
        setItemsWithImages(updatedArtists);
      } catch (error) {
        console.error('Failed to load artist images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    loadImagesForArtists();
  }, [data, visibleCount]);

  const showMore = () => {
    if (data?.artists) {
      setVisibleCount(Math.min(visibleCount + 10, data.artists.length));
    }
  };

  const showLess = () => {
    setVisibleCount(3);
  };

  const canShowMore = data?.artists && visibleCount < data.artists.length;
  const canShowLess = visibleCount > 3;
  const hasImages = itemsWithImages.length > 0;

  if (loading) {
    return (
      <div className="top-artists-section">
        <div className="top-artists-loading">Loading your top artists...</div>
      </div>
    );
  }

  if (error || !data?.artists) {
    return (
      <div className="top-artists-section">
        <div className="top-artists-error">Unable to load artists data</div>
      </div>
    );
  }

  // Use progressive data if available, otherwise fall back to basic data
  const displayData = hasImages ? itemsWithImages : data.artists;

  return (
    <div className="top-artists-section">
      <TopContentList 
        title="Top Artists" 
        items={displayData} 
        type="artists"
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