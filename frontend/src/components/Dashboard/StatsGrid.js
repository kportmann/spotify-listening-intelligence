import StatCard from '../common/StatCard/StatCard';
import './StatsGrid.css';

export default function StatsGrid({ stats }) {
  if (!stats) {
    return null;
  }

  return (
    <div className="stats-section">
      <h2 className="stats-header">Music Quick Stats</h2>
      <div className="stats-grid">
        <StatCard 
          title="Music Hours" 
          value={stats.music.listening_time.hours.toLocaleString()} 
          subtitle="hours listened"
        />
        
        <StatCard 
          title="Music Streams" 
          value={stats.music.stream_count.toLocaleString()} 
          subtitle="tracks played"
        />
        
        <StatCard 
          title="Days of Music" 
          value={stats.music.listening_time.days} 
          subtitle="equivalent days"
        />
        
        <StatCard 
          title="Daily Average" 
          value={`${Math.round(stats.music.listening_time.hours / stats.time_period.streaming_days)} hrs`} 
          subtitle={`Based on ${stats.time_period.streaming_days} days`}
        />
      </div>
    </div>
  );
}