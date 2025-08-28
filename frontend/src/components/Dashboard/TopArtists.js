import { useState, useEffect } from 'react';
import { useTopContent } from '../../hooks/useTopContent';
import { topContentService } from '../../services/topContentService';
import TopContentCarousel from './TopContentCarousel';
import ExpandableTopList from './ExpandableTopList';
import './TopArtists.css';

export default function TopArtists({ period = 'all_time', limit = 100 }) {
  const { data, loading, error } = useTopContent(period, limit);
  const [itemsWithImages, setItemsWithImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);

  // Load images for artists
  useEffect(() => {
    if (!data?.artists) return;

    const loadImagesForArtists = async () => {
      setLoadingImages(true);
      
      try {
        // Load images for more items when expanded, otherwise just top 10
        const itemsToLoad = showExpanded ? 40 : 10;
        const artistsToLoad = data.artists.slice(0, itemsToLoad).map(a => a.artist_name);
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
  }, [data, showExpanded]);

  const toggleExpanded = () => {
    setShowExpanded(!showExpanded);
  };

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
      {!showExpanded ? (
        <>
          <TopContentCarousel 
            items={displayData}
            type="artists"
            title="Top Artists"
          />
          
          <div className="carousel-actions">
            <button 
              onClick={toggleExpanded}
              className="show-more-btn"
              disabled={loadingImages}
            >
              {loadingImages ? 'Loading...' : 'Show More'}
            </button>
          </div>
        </>
      ) : (
        <>
          <ExpandableTopList
            items={displayData}
            type="artists"
            title="All Top Artists"
            loadingImages={loadingImages}
          />
          
          <div className="carousel-actions">
            <button 
              onClick={toggleExpanded}
              className="show-less-btn"
            >
              Show Less
            </button>
          </div>
        </>
      )}
    </div>
  );
}