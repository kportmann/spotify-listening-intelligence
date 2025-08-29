import React, { useState, useEffect } from 'react';
import './ListeningPatterns.css';
import ListeningHeatmap from './ListeningHeatmap';
import { basicStatsService } from '../../services/basicStatsService';

export default function ListeningPatterns() {
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('all_time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const yearsData = await basicStatsService.getAvailableYears();
        setAvailableYears(yearsData.years);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch available years:', error);
        setLoading(false);
      }
    };

    fetchAvailableYears();
  }, []);

  if (loading) {
    return (
      <div className="listening-patterns-page">
        <div className="listening-patterns-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="listening-patterns-page">
      <div className="listening-patterns-header">
        <h1 className="page-title">Listening Patterns</h1>
        <p className="page-description">
          Discover your unique listening habits and explore detailed patterns in your music consumption.
        </p>
      </div>

      {availableYears.length > 0 && (
        <div className="year-selector">
          <label htmlFor="year-select" className="year-selector-label">Time Period:</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="year-selector-dropdown"
          >
            <option value="all_time">All Time</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      <div className="patterns-content">
        <ListeningHeatmap selectedYear={selectedYear === 'all_time' ? null : parseInt(selectedYear)} />
        
        <div className="pattern-section">
          <h2 className="section-title">More Patterns Coming Soon</h2>
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