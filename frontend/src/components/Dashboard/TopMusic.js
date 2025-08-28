import TopArtists from './TopArtists';
import TopTracks from './TopTracks';
import './TopMusic.css';

export default function TopMusic({ period = 'all_time', limit = 5 }) {
  return (
    <div className="top-music-section">
      <h2 className="top-music-header">Your Top Music</h2>
      <div className="top-music-grid">
        <TopArtists period={period} limit={limit} />
        <TopTracks period={period} limit={limit} />
      </div>
    </div>
  );
}