import StatCard from '../common/StatCard/StatCard';
import './StatsGrid.css';

export default function StatsGrid({ stats }) {
  if (!stats) {
    return null;
  }

  return (
    <div className="stats-section">
      <h2 className="stats-header">Quick Stats</h2>
      <div className="stats-grid">
        <StatCard 
          title="Total Hours" 
          value={stats.total.listening_time.hours.toLocaleString()} 
          subtitle="hours listened"
        />
        
        <StatCard 
          title="Total Streams" 
          value={stats.total.stream_count.toLocaleString()} 
          subtitle="tracks played"
        />
        
        <StatCard 
          title="Days of Music" 
          value={stats.total.listening_time.days} 
          subtitle="equivalent days"
        />
        
        <StatCard 
          title="Daily Average" 
          value={`${Math.round(stats.total.listening_time.hours / stats.time_period.streaming_days)} hrs`} 
          subtitle={`Based on ${stats.time_period.streaming_days} days`}
        />
      </div>
    </div>
  );
}