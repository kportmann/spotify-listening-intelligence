import TopArtists from './TopArtists';
import TopTracks from './TopTracks';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import './TopMusic.css';

export default function TopMusic({ period = 'all_time', limit = 10 }) {
  return (
    <div className="top-music-section">
      <SectionTitle title="Your Top Music" />
      <div className="top-music-grid">
        <TopArtists period={period} limit={limit} />
        <TopTracks period={period} limit={limit} />
      </div>
    </div>
  );
}