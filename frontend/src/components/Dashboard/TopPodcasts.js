import { useTopContent } from '../../hooks/useTopContent';
import TopContentList from './TopContentList';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import './TopPodcasts.css';

export default function TopPodcasts({ period = 'all_time', limit = 5 }) {
  const { data, loading, error } = useTopContent(period, limit);

  if (loading) {
    return <div className="top-content-loading">Loading your top Podcasts...</div>;
  }

  if (error) {
    return <div className="top-content-error">Error loading top Podcasts: {error.message}</div>;
  }

  if (!data) {
    return <div className="top-content-error">No data available</div>;
  }

  const hasOtherContent = (data.episodes && data.episodes.length > 0) || 
                          (data.shows && data.shows.length > 0) || 
                          (data.audiobooks && data.audiobooks.length > 0);

  if (!hasOtherContent) {
    return null;
  }

  return (
    <div className="top-content-section">
      <SectionTitle title="Your Top Podcasts" />
      <div className="top-content-grid">
        {data.episodes && data.episodes.length > 0 && (
          <TopContentList 
            title="Top Episodes" 
            items={data.episodes} 
            type="episodes"
            loading={false}
            error={null}
          />
        )}
        
        {data.shows && data.shows.length > 0 && (
          <TopContentList 
            title="Top Shows" 
            items={data.shows} 
            type="shows"
            loading={false}
            error={null}
          />
        )}
        
        {data.audiobooks && data.audiobooks.length > 0 && (
          <TopContentList 
            title="Top Audiobooks" 
            items={data.audiobooks} 
            type="audiobooks"
            loading={false}
            error={null}
          />
        )}
      </div>
    </div>
  );
}