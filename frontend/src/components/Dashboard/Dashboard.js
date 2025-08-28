import { useAnalytics } from '../../hooks/useAnalytics';
import HeroStats from './HeroStats';
import StatsGrid from './StatsGrid';
import TopMusic from './TopMusic';
import TopContent from './TopContent';

export default function Dashboard() {
  const { stats, loading, error } = useAnalytics();

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error.message}</div>;
  }

  return (
    <div className="dashboard">
      <HeroStats stats={stats} />
      
      <StatsGrid stats={stats} />
      
      <TopMusic period="all_time" limit={100} />
      
      <TopContent period="all_time" limit={5} />
    </div>
  );
}