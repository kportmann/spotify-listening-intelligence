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