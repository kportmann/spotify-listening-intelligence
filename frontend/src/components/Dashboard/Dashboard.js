import { useAnalytics } from '../../hooks/useAnalytics';
import StatsGrid from './StatsGrid';

export default function Dashboard() {
  const { stats, loading, error } = useAnalytics();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <StatsGrid stats={stats} />;
}