import StatCard from '../common/StatCard/StatCard';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import './StatsGrid.css';

export default function StatsGrid({ stats, period = 'all_time' }) {
  if (!stats) {
    return null;
  }

  const getPeriodLabel = (period) => {
    if (period === 'all_time') return 'All Time';
    if (period && period.length === 4 && !isNaN(period)) return period;
    return period;
  };

  return (
    <div className="stats-section">
      <SectionTitle title="Quick Stats - Music" />
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
          value={`${Math.round((stats.music.listening_time.hours / stats.time_period.streaming_days) * 60)} min`} 
          subtitle={`Based on ${stats.time_period.streaming_days} days`}
        />
      </div>
    </div>
  );
}