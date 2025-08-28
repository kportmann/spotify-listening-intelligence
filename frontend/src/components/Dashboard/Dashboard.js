import { useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import HeroStats from './HeroStats';
import StatsGrid from './StatsGrid';
import TopMusic from './TopMusic';
import TopPodcasts from './TopPodcasts';
import TimePeriodSelector from './TimePeriodSelector';
import WannaSeeMore from './WannaSeeMore';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');
  const { stats, loading, error } = useAnalytics(selectedPeriod);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error.message}</div>;
  }

  return (
    <div className="dashboard">
      <HeroStats stats={stats} />
      
      <TimePeriodSelector 
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />
      
      <StatsGrid stats={stats} period={selectedPeriod} />
      
      <TopMusic period={selectedPeriod} limit={100} />
      
      <TopPodcasts period={selectedPeriod} limit={5} />
      
      <WannaSeeMore />
    </div>
  );
}