import React, { useState } from 'react';
import './ListeningPatterns.css';
import ListeningHeatmap from './ListeningHeatmap';
import MonthlyTrends from './MonthlyTrends';
import SeasonalTrends from './SeasonalTrends';
import SkipRateAnalysis from './SkipRateAnalysis';
import TimePeriodSelector from '../common/TimePeriodSelector/TimePeriodSelector';
import PageHeader from '../common/PageHeader/PageHeader';

export default function ListeningPatterns() {
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');

  return (
    <div className="listening-patterns-page">
      <PageHeader 
        title="Listening Patterns"
        description="Discover your unique listening habits and explore detailed patterns in your music consumption."
      />

      <TimePeriodSelector 
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <div className="patterns-content">
        <ListeningHeatmap selectedYear={selectedPeriod === 'all_time' ? null : parseInt(selectedPeriod)} />
        
        <MonthlyTrends selectedYear={selectedPeriod === 'all_time' ? null : parseInt(selectedPeriod)} />
        
        <SeasonalTrends selectedYear={selectedPeriod === 'all_time' ? null : parseInt(selectedPeriod)} />
        
        <SkipRateAnalysis selectedYear={selectedPeriod === 'all_time' ? null : parseInt(selectedPeriod)} />
      </div>
    </div>
  );
}