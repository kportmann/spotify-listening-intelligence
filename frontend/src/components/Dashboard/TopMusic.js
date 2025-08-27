import { useTopContent } from '../../hooks/useTopContent';
import TopContentList from './TopContentList';
import './TopMusic.css';

export default function TopMusic({ period = 'all_time', limit = 5 }) {
  const { data, loading, error } = useTopContent(period, limit);

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

  return (
    <div className="top-music-section">
      <h2 className="top-music-header">Your Top Music</h2>
      <div className="top-music-grid">
        <TopContentList 
          title="Top Artists" 
          items={data.artists} 
          type="artists"
          loading={false}
          error={null}
        />
        
        <TopContentList 
          title="Top Tracks" 
          items={data.tracks} 
          type="tracks"
          loading={false}
          error={null}
        />
      </div>
    </div>
  );
}