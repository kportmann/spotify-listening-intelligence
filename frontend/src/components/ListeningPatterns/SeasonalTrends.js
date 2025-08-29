import React, { useState, useEffect } from 'react';
import './SeasonalTrends.css';
import { listeningPatternsService } from '../../services/listeningPatternsService';
import SectionTitle from '../common/SectionTitle/SectionTitle';

export default function SeasonalTrends({ selectedYear = null }) {
  const [seasonalData, setSeasonalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimezone] = useState('UTC');

  useEffect(() => {
    const fetchSeasonalTrends = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listeningPatternsService.getSeasonalTrends(selectedYear, selectedTimezone);
        setSeasonalData(data);
      } catch (err) {
        console.error('Failed to fetch seasonal trends:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonalTrends();
  }, [selectedYear, selectedTimezone]);

  const getSeasonIcon = (season) => {
    switch (season) {
      case 'Spring': return '🌸';
      case 'Summer': return '☀️';
      case 'Fall': return '🍂';
      case 'Winter': return '❄️';
      default: return '🎵';
    }
  };

  const getSeasonColor = (season) => {
    switch (season) {
      case 'Spring': return { bg: 'rgba(152, 251, 152, 0.2)', accent: '#98fb98' };
      case 'Summer': return { bg: 'rgba(255, 215, 0, 0.2)', accent: '#ffd700' };
      case 'Fall': return { bg: 'rgba(255, 140, 0, 0.2)', accent: '#ff8c00' };
      case 'Winter': return { bg: 'rgba(173, 216, 230, 0.2)', accent: '#add8e6' };
      default: return { bg: 'rgba(29, 185, 84, 0.2)', accent: '#1db954' };
    }
  };

  const getMaxValues = () => {
    if (!seasonalData?.seasonal_trends) return { streams: 0, minutes: 0 };
    
    return {
      streams: Math.max(...seasonalData.seasonal_trends.map(s => s.total_streams)),
      minutes: Math.max(...seasonalData.seasonal_trends.map(s => s.total_minutes))
    };
  };

  const getProgressWidth = (value, maxValue) => {
    if (!value || maxValue === 0) return 0;
    return (value / maxValue) * 100;
  };

  if (loading) {
    return (
      <div className="seasonal-trends-container">
        <SectionTitle title="Seasonal Listening Trends" />
        <div className="trends-loading">
          Loading seasonal trends{selectedYear ? ` for ${selectedYear}` : ''}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seasonal-trends-container">
        <div className="trends-error">Failed to load seasonal trends: {error}</div>
      </div>
    );
  }

  if (!seasonalData?.seasonal_trends || seasonalData.seasonal_trends.length === 0) {
    return (
      <div className="seasonal-trends-container">
        <SectionTitle title="Seasonal Listening Trends" />
        <div className="trends-section">
          <p className="section-description">
            Your listening patterns across the four seasons{selectedYear && ` for ${selectedYear}`} - discover how your music taste changes throughout the year
          </p>
        </div>
        <div className="trends-error">
          No seasonal data available{selectedYear ? ` for ${selectedYear}` : ''}. 
          {selectedYear && ' Try selecting a different year or "All Time" to see your listening patterns.'}
        </div>
      </div>
    );
  }

  const maxValues = getMaxValues();

  return (
    <div className="seasonal-trends-container">
      <SectionTitle title="Seasonal Listening Trends" />
      
      <div className="trends-section">
        <p className="section-description">
          Your listening patterns across the four seasons{selectedYear && ` for ${selectedYear}`} - discover how your music taste changes throughout the year
        </p>
      </div>

      <div className="seasons-grid">
        {seasonalData.seasonal_trends.map((season) => {
          const colors = getSeasonColor(season.season);
          
          return (
            <div 
              key={season.season} 
              className="season-card"
              style={{ background: colors.bg, borderColor: colors.accent }}
            >
              <div className="season-header">
                <div className="season-icon">{getSeasonIcon(season.season)}</div>
                <h3 className="season-name" style={{ color: colors.accent }}>
                  {season.season}
                </h3>
              </div>

              <div className="season-stats">
                <div className="stat-item">
                  <div className="stat-label">Total Streams</div>
                  <div className="stat-value">{season.total_streams.toLocaleString()}</div>
                  <div className="stat-bar">
                    <div 
                      className="stat-progress streams-progress"
                      style={{ 
                        width: `${getProgressWidth(season.total_streams, maxValues.streams)}%`,
                        backgroundColor: colors.accent 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-label">Total Minutes</div>
                  <div className="stat-value">{season.total_minutes.toLocaleString()}</div>
                  <div className="stat-bar">
                    <div 
                      className="stat-progress minutes-progress"
                      style={{ 
                        width: `${getProgressWidth(season.total_minutes, maxValues.minutes)}%`,
                        backgroundColor: colors.accent,
                        opacity: 0.8 
                      }}
                    ></div>
                  </div>
                </div>

                {season.years_covered > 1 && (
                  <>
                    <div className="stat-item">
                      <div className="stat-label">Avg Streams/Year</div>
                      <div className="stat-value">{season.avg_streams_per_year.toLocaleString()}</div>
                    </div>

                    <div className="stat-item">
                      <div className="stat-label">Avg Minutes/Year</div>
                      <div className="stat-value">{season.avg_minutes_per_year.toLocaleString()}</div>
                    </div>
                  </>
                )}

                <div className="years-covered">
                  <span className="years-label">Years covered: </span>
                  <span className="years-value">{season.years_covered}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}