import { useTopContent } from '../../hooks/useTopContent';
import TopContentList from './TopContentList';
import './TopContent.css';

export default function TopContent({ period = 'all_time', limit = 5 }) {
  const { data, loading, error } = useTopContent(period, limit);

  if (loading) {
    return <div className="top-content-loading">Loading top content...</div>;
  }

  if (error) {
    return <div className="top-content-error">Error loading top content: {error.message}</div>;
  }

  if (!data) {
    return <div className="top-content-error">No data available</div>;
  }

  return (
    <div className="top-content-grid">
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
  );
}