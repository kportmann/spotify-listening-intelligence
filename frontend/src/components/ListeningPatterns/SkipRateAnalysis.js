import React, { useState, useEffect } from 'react';
import './SkipRateAnalysis.css';
import { listeningPatternsService } from '../../services/listeningPatternsService';
import SectionTitle from '../common/SectionTitle/SectionTitle';

export default function SkipRateAnalysis({ selectedYear = null }) {
  const [skipData, setSkipData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState('Europe/Zurich');
  const [activeView, setActiveView] = useState('overview');

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/Zurich', label: 'Europe/Zurich (CET/CEST)' },
    { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
    { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  ];

  useEffect(() => {
    const fetchSkipData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listeningPatternsService.getSkipRateAnalysis(selectedYear, selectedTimezone);
        setSkipData(data);
      } catch (err) {
        console.error('Failed to fetch skip rate data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSkipData();
  }, [selectedYear, selectedTimezone]);

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const getSkipRateColor = (skipRate) => {
    if (skipRate <= 10) return '#1db954'; // Green - low skip rate
    if (skipRate <= 25) return '#1ed760'; // Light green
    if (skipRate <= 40) return '#ffa500'; // Orange
    if (skipRate <= 60) return '#ff6b35'; // Orange-red
    return '#ff0000'; // Red - high skip rate
  };

  const renderOverviewStats = () => {
    if (!skipData?.overall_stats) return null;

    const { overall_stats, insights } = skipData;

    return (
      <div className="skip-overview">
        <div className="skip-stats-grid">
          <div className="skip-stat-card">
            <div className="stat-value" style={{ color: getSkipRateColor(overall_stats.skip_rate) }}>
              {overall_stats.skip_rate}%
            </div>
            <div className="stat-label">Skip Rate</div>
            <div className="stat-detail">{overall_stats.skipped_streams.toLocaleString()} skipped</div>
          </div>

          <div className="skip-stat-card">
            <div className="stat-value" style={{ color: '#1db954' }}>
              {overall_stats.completion_rate}%
            </div>
            <div className="stat-label">Completion Rate</div>
            <div className="stat-detail">{(overall_stats.total_streams - overall_stats.skipped_streams).toLocaleString()} completed</div>
          </div>

          <div className="skip-stat-card">
            <div className="stat-value">
              {overall_stats.total_streams.toLocaleString()}
            </div>
            <div className="stat-label">Total Streams</div>
            <div className="stat-detail">analyzed</div>
          </div>
        </div>

        {insights && (
          <div className="skip-insights">
            <h4>Key Insights</h4>
            <div className="insights-grid">
              {insights.most_skipped_artist && (
                <div className="insight-card">
                  <div className="insight-title">Most Skipped Artist</div>
                  <div className="insight-value">{insights.most_skipped_artist.artist_name}</div>
                  <div className="insight-detail">{insights.most_skipped_artist.skip_rate}% skip rate</div>
                </div>
              )}

              {insights.least_skipped_artist && (
                <div className="insight-card">
                  <div className="insight-title">Least Skipped Artist</div>
                  <div className="insight-value">{insights.least_skipped_artist.artist_name}</div>
                  <div className="insight-detail">{insights.least_skipped_artist.skip_rate}% skip rate</div>
                </div>
              )}

              {insights.peak_skip_hour && (
                <div className="insight-card">
                  <div className="insight-title">Peak Skip Time</div>
                  <div className="insight-value">{formatHour(insights.peak_skip_hour.hour)}</div>
                  <div className="insight-detail">{insights.peak_skip_hour.skip_rate}% skip rate</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHourlyChart = () => {
    if (!skipData?.hourly_skip_rates) return null;

    const maxSkipRate = Math.max(...skipData.hourly_skip_rates.map(d => d.skip_rate));
    const chartHeight = 200;
    const chartWidth = 600;
    const barWidth = 20;
    const spacing = 25;

    return (
      <div className="hourly-skip-chart">
        <h4>Skip Rate by Hour of Day</h4>
        <svg width={chartWidth} height={chartHeight + 60} className="skip-chart-svg">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(value => (
            <g key={value}>
              <line
                x1="40"
                y1={chartHeight - (value / 100) * chartHeight + 20}
                x2={chartWidth - 20}
                y2={chartHeight - (value / 100) * chartHeight + 20}
                stroke="#333"
                strokeDasharray="2,2"
              />
              <text
                x="35"
                y={chartHeight - (value / 100) * chartHeight + 25}
                textAnchor="end"
                fontSize="10"
                fill="#888"
              >
                {value}%
              </text>
            </g>
          ))}

          {/* Bars */}
          {skipData.hourly_skip_rates.map((data, index) => {
            const barHeight = (data.skip_rate / 100) * chartHeight;
            const x = 50 + index * spacing;
            const y = chartHeight - barHeight + 20;

            return (
              <g key={data.hour}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={getSkipRateColor(data.skip_rate)}
                  className="skip-bar"
                >
                  <title>{`${formatHour(data.hour)}: ${data.skip_rate}% skip rate (${data.skipped_count}/${data.total_streams})`}</title>
                </rect>
                {index % 2 === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 40}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#888"
                  >
                    {data.hour}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderArtistTable = () => {
    if (!skipData?.artist_skip_rates) return null;

    // Sort by skip rate descending, then by total streams descending
    const sortedArtists = [...skipData.artist_skip_rates].sort((a, b) => {
      if (Math.abs(a.skip_rate - b.skip_rate) < 0.1) {
        return b.total_streams - a.total_streams;
      }
      return b.skip_rate - a.skip_rate;
    });

    return (
      <div className="artist-skip-table">
        <h4>Skip Rate by Artist (Top 20)</h4>
        <div className="table-container">
          <table className="skip-table">
            <thead>
              <tr>
                <th>Artist</th>
                <th>Skip Rate</th>
                <th>Skipped</th>
                <th>Total Streams</th>
                <th>Visual</th>
              </tr>
            </thead>
            <tbody>
              {sortedArtists.slice(0, 20).map((artist, index) => (
                <tr key={artist.artist_name}>
                  <td className="artist-name">{artist.artist_name}</td>
                  <td className="skip-rate" style={{ color: getSkipRateColor(artist.skip_rate) }}>
                    {artist.skip_rate}%
                  </td>
                  <td>{artist.skipped_count}</td>
                  <td>{artist.total_streams}</td>
                  <td>
                    <div className="skip-rate-bar">
                      <div 
                        className="skip-rate-fill"
                        style={{
                          width: `${artist.skip_rate}%`,
                          backgroundColor: getSkipRateColor(artist.skip_rate)
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMonthlyTrend = () => {
    if (!skipData?.monthly_skip_trends) return null;

    const chartHeight = 180;
    const chartWidth = 800;
    const data = skipData.monthly_skip_trends;
    
    if (data.length === 0) return null;

    const maxSkipRate = Math.max(...data.map(d => d.skip_rate));
    const pointSpacing = (chartWidth - 100) / Math.max(data.length - 1, 1);

    return (
      <div className="monthly-trend-chart">
        <h4>Skip Rate Trend Over Time</h4>
        <svg width={chartWidth} height={chartHeight + 80} className="trend-chart-svg">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(value => (
            <g key={value}>
              <line
                x1="50"
                y1={chartHeight - (value / 100) * chartHeight + 20}
                x2={chartWidth - 20}
                y2={chartHeight - (value / 100) * chartHeight + 20}
                stroke="#333"
                strokeDasharray="2,2"
              />
              <text
                x="45"
                y={chartHeight - (value / 100) * chartHeight + 25}
                textAnchor="end"
                fontSize="10"
                fill="#888"
              >
                {value}%
              </text>
            </g>
          ))}

          {/* Line and points */}
          <g>
            <polyline
              points={data.map((d, i) => {
                const x = 50 + i * pointSpacing;
                const y = chartHeight - (d.skip_rate / 100) * chartHeight + 20;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#1db954"
              strokeWidth="2"
            />

            {data.map((d, index) => {
              const x = 50 + index * pointSpacing;
              const y = chartHeight - (d.skip_rate / 100) * chartHeight + 20;

              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={getSkipRateColor(d.skip_rate)}
                    className="trend-point"
                  >
                    <title>{`${d.month_name} ${d.year}: ${d.skip_rate}% skip rate`}</title>
                  </circle>
                  {index % Math.ceil(data.length / 8) === 0 && (
                    <text
                      x={x}
                      y={chartHeight + 50}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#888"
                      transform={`rotate(-45, ${x}, ${chartHeight + 50})`}
                    >
                      {d.month_name.substring(0, 3)} {d.year}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="skip-analysis-container">
        <div className="skip-loading">Loading skip rate analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="skip-analysis-container">
        <div className="skip-error">Failed to load skip rate analysis: {error}</div>
      </div>
    );
  }

  if (!skipData) {
    return (
      <div className="skip-analysis-container">
        <div className="skip-error">No skip rate data available</div>
      </div>
    );
  }

  return (
    <div className="skip-analysis-container">
      <SectionTitle title="Skip Rate Analysis" />
      
      <div className="skip-section">
        <p className="section-description">
          Analysis of your skipping behavior and patterns{selectedYear && ` for ${selectedYear}`}
        </p>
      </div>

      <div className="skip-header">
        <div className="timezone-selector">
          <label htmlFor="skip-timezone-select" className="timezone-label">Timezone:</label>
          <select
            id="skip-timezone-select"
            value={selectedTimezone}
            onChange={(e) => setSelectedTimezone(e.target.value)}
            className="timezone-dropdown"
          >
            {timezoneOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="view-selector">
          <button
            className={`view-btn ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            Overview
          </button>
          <button
            className={`view-btn ${activeView === 'hourly' ? 'active' : ''}`}
            onClick={() => setActiveView('hourly')}
          >
            By Hour
          </button>
          <button
            className={`view-btn ${activeView === 'artists' ? 'active' : ''}`}
            onClick={() => setActiveView('artists')}
          >
            By Artist
          </button>
          <button
            className={`view-btn ${activeView === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveView('trends')}
          >
            Trends
          </button>
        </div>
      </div>

      <div className="skip-content">
        {activeView === 'overview' && renderOverviewStats()}
        {activeView === 'hourly' && renderHourlyChart()}
        {activeView === 'artists' && renderArtistTable()}
        {activeView === 'trends' && renderMonthlyTrend()}
      </div>

      {skipData.skip_reasons && skipData.skip_reasons.length > 0 && (
        <div className="skip-reasons">
          <h4>Skip Reasons</h4>
          <div className="reasons-list">
            {skipData.skip_reasons.slice(0, 5).map((reason, index) => (
              <div key={reason.reason} className="reason-item">
                <span className="reason-name">{reason.reason}</span>
                <span className="reason-count">{reason.count} times</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}