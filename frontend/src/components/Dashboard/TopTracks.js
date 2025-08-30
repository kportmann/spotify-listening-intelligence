import { useState, useEffect } from 'react';
import { musicService } from '../../services/musicService';
import TopContentCarousel from './TopContentCarousel';
import ExpandableTopList from './ExpandableTopList';
import ExpandButton from '../common/ExpandButton/ExpandButton';
import './TopTracks.css';

export default function TopTracks({ period = 'all_time', limit = 100 }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExpanded, setShowExpanded] = useState(false);

  // Load tracks with images included
  useEffect(() => {
    const loadTracksWithImages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const tracksData = await musicService.getTopTracksWithImages(period, limit);
        
        // Debug: Log image loading statistics
        const totalTracks = tracksData.length;
        const tracksWithImages = tracksData.filter(track => track.image_url).length;
        const tracksWithoutImages = tracksData.filter(track => !track.image_url);
        const successRate = (tracksWithImages / totalTracks) * 100;
        
        console.log(`[TopTracks Debug] Image loading stats:`, {
          total: totalTracks,
          withImages: tracksWithImages,
          withoutImages: totalTracks - tracksWithImages,
          successRate: `${successRate.toFixed(1)}%`
        });
        
        // Auto-retry with cache refresh if success rate is too low
        if (successRate < 60 && !loadTracksWithImages._retried) {
          console.log(`[TopTracks Debug] Low success rate (${successRate.toFixed(1)}%), retrying with cache refresh...`);
          loadTracksWithImages._retried = true;
          
          try {
            const retryData = await musicService.getTopTracksWithImages(period, limit, true);
            const retrySuccess = (retryData.filter(track => track.image_url).length / retryData.length) * 100;
            console.log(`[TopTracks Debug] Retry success rate: ${retrySuccess.toFixed(1)}%`);
            setTracks(retryData);
            return;
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        }
        
        // Log first few tracks without images for investigation
        if (tracksWithoutImages.length > 0) {
          console.log(`[TopTracks Debug] Tracks without images:`, 
            tracksWithoutImages.slice(0, 5).map(track => ({
              name: track.track_name,
              artist: track.artist_name,
              rank: tracksData.indexOf(track) + 1,
              image_url: track.image_url
            }))
          );
        }
        
        setTracks(tracksData);
      } catch (err) {
        console.error('Failed to load tracks with images:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadTracksWithImages();
  }, [period, limit]);

  const toggleExpanded = () => {
    setShowExpanded(!showExpanded);
  };

  if (loading) {
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
            isLoading={false}
          />
        </>
      ) : (
        <>
          <ExpandableTopList
            items={tracks}
            type="tracks"
            title="All Top Tracks"
            loadingImages={false}
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