import { useState, useEffect } from 'react';
import { musicService } from '../../services/musicService';
import TopContentCarousel from './TopContentCarousel';
import ExpandableTopList from './ExpandableTopList';
import ExpandButton from '../common/ExpandButton/ExpandButton';
import './TopArtists.css';

export default function TopArtists({ period = 'all_time', limit = 100 }) {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExpanded, setShowExpanded] = useState(false);

  // Load artists with images included
  useEffect(() => {
    const loadArtistsWithImages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const artistsData = await musicService.getTopArtistsWithImages(period, limit);
        
        // Debug: Log image loading statistics
        const totalArtists = artistsData.length;
        const artistsWithImages = artistsData.filter(artist => artist.image_url).length;
        const artistsWithoutImages = artistsData.filter(artist => !artist.image_url);
        const successRate = (artistsWithImages / totalArtists) * 100;
        
        console.log(`[TopArtists Debug] Image loading stats:`, {
          total: totalArtists,
          withImages: artistsWithImages,
          withoutImages: totalArtists - artistsWithImages,
          successRate: `${successRate.toFixed(1)}%`
        });
        
        // Auto-retry with cache refresh if success rate is too low
        if (successRate < 60 && !loadArtistsWithImages._retried) {
          console.log(`[TopArtists Debug] Low success rate (${successRate.toFixed(1)}%), retrying with cache refresh...`);
          loadArtistsWithImages._retried = true;
          
          try {
            const retryData = await musicService.getTopArtistsWithImages(period, limit, true);
            const retrySuccess = (retryData.filter(artist => artist.image_url).length / retryData.length) * 100;
            console.log(`[TopArtists Debug] Retry success rate: ${retrySuccess.toFixed(1)}%`);
            setArtists(retryData);
            return;
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        }
        
        // Log first few artists without images for investigation
        if (artistsWithoutImages.length > 0) {
          console.log(`[TopArtists Debug] Artists without images:`, 
            artistsWithoutImages.slice(0, 5).map(artist => ({
              name: artist.artist_name,
              rank: artistsData.indexOf(artist) + 1,
              image_url: artist.image_url
            }))
          );
        }
        
        setArtists(artistsData);
      } catch (err) {
        console.error('Failed to load artists with images:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadArtistsWithImages();
  }, [period, limit]);

  const toggleExpanded = () => {
    setShowExpanded(!showExpanded);
  };

  if (loading) {
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
            isLoading={false}
          />
        </>
      ) : (
        <>
          <ExpandableTopList
            items={artists}
            type="artists"
            title="All Top Artists"
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