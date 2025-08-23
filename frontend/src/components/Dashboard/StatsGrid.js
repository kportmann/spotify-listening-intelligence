import StatCard from '../common/StatCard/StatCard';
import './StatsGrid.css';

export default function StatsGrid({ stats }) {
  if (!stats) {
    return null;
  }

  return (
    <div className="stats-grid">
      <StatCard 
        title="Total Streams" 
        value={stats.total_streams.toLocaleString()} 
        subtitle="Music tracks played"
      />
      <StatCard 
        title="Listening Time" 
        value={`${stats.total_listening_hours}h`} 
        subtitle="Total hours"
      />
      <StatCard 
        title="Unique Artists" 
        value={stats.unique_artists.toLocaleString()} 
        subtitle="Different artists"
      />
    </div>
  );
}