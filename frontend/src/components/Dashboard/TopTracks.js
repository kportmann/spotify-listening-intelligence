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