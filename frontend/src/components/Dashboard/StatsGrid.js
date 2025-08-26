import StatCard from '../common/StatCard/StatCard';
import './StatsGrid.css';

export default function StatsGrid({ stats }) {
  if (!stats) {
    return null;
  }

  return (
    <div className="stats-grid">
      <StatCard 
        title="Total Streaming Hours" 
        value={stats.total_hours.toLocaleString()} 
        subtitle="Hours listened"
      />
    </div>
  );
}