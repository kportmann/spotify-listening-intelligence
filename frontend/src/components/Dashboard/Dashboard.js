import { useAnalytics } from '../../hooks/useAnalytics';
import StatsGrid from './StatsGrid';
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
      <StatsGrid stats={stats} />
      <TopContent period="all_time" limit={5} />
    </div>
  );
}