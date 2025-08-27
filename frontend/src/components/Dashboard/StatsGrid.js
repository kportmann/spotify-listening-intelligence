import StatCard from '../common/StatCard/StatCard';
import './StatsGrid.css';

export default function StatsGrid({ stats }) {
  if (!stats) {
    return null;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="stats-grid">
      <StatCard 
        title="Total Listening Time" 
        value={`${stats.total.listening_time.hours.toLocaleString()} hrs`} 
        subtitle={`${stats.total.listening_time.days} days • ${stats.total.stream_count.toLocaleString()} streams`}
      />
      
      <StatCard 
        title="Music Tracks" 
        value={`${stats.music.listening_time.hours.toLocaleString()} hrs`} 
        subtitle={`${stats.music.stream_count.toLocaleString()} tracks played`}
      />
      
      <StatCard 
        title="Podcast Episodes" 
        value={`${stats.episodes.listening_time.hours.toLocaleString()} hrs`} 
        subtitle={`${stats.episodes.stream_count.toLocaleString()} episodes played`}
      />
      
      <StatCard 
        title="Audiobooks" 
        value={`${stats.audiobooks.listening_time.hours.toLocaleString()} hrs`} 
        subtitle={`${stats.audiobooks.stream_count.toLocaleString()} chapters played`}
      />
      
      {stats.time_period.first_stream && stats.time_period.last_stream && (
        <StatCard 
          title="Streaming Period" 
          value={`${stats.time_period.streaming_days} days`} 
          subtitle={`${formatDate(stats.time_period.first_stream)} - ${formatDate(stats.time_period.last_stream)}`}
        />
      )}
    </div>
  );
}