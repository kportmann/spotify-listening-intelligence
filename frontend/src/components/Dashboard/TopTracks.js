import { useState, useEffect } from 'react';
import { useTopContent } from '../../hooks/useTopContent';
import { musicService } from '../../services/musicService';
import TopContentCarousel from './TopContentCarousel';
import ExpandableTopList from './ExpandableTopList';
import ExpandButton from '../common/ExpandButton/ExpandButton';
import './TopTracks.css';

export default function TopTracks({ period = 'all_time', limit = 100 }) {
  const { data, loading, error } = useTopContent(period, limit);
  const [itemsWithImages, setItemsWithImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);

  // Load images for tracks
  useEffect(() => {
    if (!data?.tracks) return;

    const loadImagesForTracks = async () => {
      setLoadingImages(true);
      
      try {
        // Load images for more items when expanded, otherwise just top 10
        const itemsToLoad = showExpanded ? 40 : 10;
        const tracksToLoad = data.tracks.slice(0, itemsToLoad);
        const imageData = await musicService.getImagesForContent([], tracksToLoad);
        
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
  }, [data, showExpanded]);

  const toggleExpanded = () => {
    setShowExpanded(!showExpanded);
  };

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
      {!showExpanded ? (
        <>
          <TopContentCarousel 
            items={displayData}
            type="tracks"
            title="Top Tracks"
          />
          
          <ExpandButton 
            isExpanded={false}
            onClick={toggleExpanded}
            isLoading={loadingImages}
          />
        </>
      ) : (
        <>
          <ExpandableTopList
            items={displayData}
            type="tracks"
            title="All Top Tracks"
            loadingImages={loadingImages}
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