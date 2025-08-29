import { useState, useEffect } from 'react';
import { basicStatsService } from '../../../services/basicStatsService';
import './TimePeriodSelector.css';

export default function TimePeriodSelector({ selectedPeriod, onPeriodChange }) {
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    basicStatsService.getAvailableYears()
      .then(data => {
        setAvailableYears(data.years);
      })
      .catch(error => {
        console.error('Failed to fetch available years:', error);
        // Fallback to default years if API fails
        setAvailableYears([2024, 2023, 2022, 2021, 2020]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="time-period-selector">
        <div className="time-period-label">Loading years...</div>
      </div>
    );
  }

  return (
    <div className="time-period-selector">
      <div className="time-period-label">View data for:</div>
      <div className="time-period-buttons">
        <button
          className={`period-btn ${selectedPeriod === 'all_time' ? 'active' : ''}`}
          onClick={() => onPeriodChange('all_time')}
        >
          All Time
        </button>
      </div>
      
      <div className="time-period-label">Or by year:</div>
      <div className="time-period-buttons">
        {availableYears.map((year) => (
          <button
            key={year.toString()}
            className={`period-btn ${selectedPeriod === year.toString() ? 'active' : ''}`}
            onClick={() => onPeriodChange(year.toString())}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}