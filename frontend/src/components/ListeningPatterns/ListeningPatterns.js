import React, { useState } from 'react';
import './ListeningPatterns.css';
import ListeningHeatmap from './ListeningHeatmap';
import TimePeriodSelector from '../common/TimePeriodSelector/TimePeriodSelector';
import SectionTitle from '../common/SectionTitle/SectionTitle';

export default function ListeningPatterns() {
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');

  return (
    <div className="listening-patterns-page">
      <div className="listening-patterns-header">
        <h1 className="page-title">Listening Patterns</h1>
        <p className="page-description">
          Discover your unique listening habits and explore detailed patterns in your music consumption.
        </p>
      </div>

      <TimePeriodSelector 
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <div className="patterns-content">
        <ListeningHeatmap selectedYear={selectedPeriod === 'all_time' ? null : parseInt(selectedPeriod)} />
        
        <div className="pattern-section">
          <SectionTitle title="More Patterns Coming Soon" />
          <div className="placeholder-content">
            <p>Additional listening pattern analysis will be available here soon!</p>
            <p>Future features will include:</p>
            <ul>
              <li>Monthly/seasonal listening trends</li>
              <li>Skip rate analysis</li>
              <li>Listening streaks and consistency metrics</li>
              <li>Genre preferences over time</li>
              <li>And much more!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}