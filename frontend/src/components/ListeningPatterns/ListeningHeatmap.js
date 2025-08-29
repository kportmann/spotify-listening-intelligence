import React, { useState, useEffect } from 'react';
import './ListeningHeatmap.css';
import { listeningPatternsService } from '../../services/listeningPatternsService';

export default function ListeningHeatmap({ selectedYear = null }) {
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState('Europe/Zurich');

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/Zurich', label: 'Europe/Zurich (CET/CEST)' },
    { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
    { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  ];

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listeningPatternsService.getListeningHeatmap(selectedYear, selectedTimezone);
        setHeatmapData(data);
      } catch (err) {
        console.error('Failed to fetch heatmap data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmapData();
  }, [selectedYear, selectedTimezone]);

  const getIntensityColor = (value, maxValue, type = 'streams') => {
    if (!value || maxValue === 0) return 'rgba(29, 185, 84, 0.1)';
    
    const intensity = value / maxValue;
    const baseColor = type === 'streams' ? '29, 185, 84' : '30, 215, 96'; // Green variations
    
    // Create different intensity levels
    if (intensity <= 0.1) return `rgba(${baseColor}, 0.15)`;
    if (intensity <= 0.3) return `rgba(${baseColor}, 0.35)`;
    if (intensity <= 0.5) return `rgba(${baseColor}, 0.55)`;
    if (intensity <= 0.7) return `rgba(${baseColor}, 0.75)`;
    return `rgba(${baseColor}, 0.95)`;
  };

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const formatTooltipContent = (day, hour, data) => {
    return (
      <div className="heatmap-tooltip">
        <div className="tooltip-title">{day} at {formatHour(hour)}</div>
        <div className="tooltip-stats">
          <div>{data.stream_count} streams</div>
          <div>{data.total_minutes} minutes</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="heatmap-container">
        <div className="heatmap-loading">Loading listening patterns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="heatmap-container">
        <div className="heatmap-error">Failed to load heatmap: {error}</div>
      </div>
    );
  }

  if (!heatmapData || !heatmapData.heatmap_data) {
    return (
      <div className="heatmap-container">
        <div className="heatmap-error">No data available</div>
      </div>
    );
  }

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <h3 className="heatmap-title">Listening Activity Heatmap</h3>
        <p className="heatmap-description">
          Your listening patterns by day of week and time of day
          {selectedYear && ` for ${selectedYear}`}
        </p>
        
        <div className="timezone-selector">
          <label htmlFor="timezone-select" className="timezone-label">Timezone:</label>
          <select
            id="timezone-select"
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
      </div>

      {heatmapData.summary?.peak_hour && (
        <div className="peak-hour-info">
          <strong>Peak listening time:</strong> {heatmapData.summary.peak_hour.day} at {formatHour(heatmapData.summary.peak_hour.hour)} 
          <span className="peak-stats">
            ({heatmapData.summary.peak_hour.stream_count} streams, {heatmapData.summary.peak_hour.total_minutes} minutes)
          </span>
        </div>
      )}

      <div className="heatmap-grid-container">
        {/* Hour labels */}
        <div className="hour-labels">
          <div className="hour-label-spacer"></div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="hour-label" title={formatHour(hour)}>
              {hour % 6 === 0 ? formatHour(hour) : ''}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="heatmap-grid">
          {heatmapData.day_names.map((day, dayIndex) => (
            <div key={day} className="heatmap-row">
              <div className="day-label">{day.substring(0, 3)}</div>
              {heatmapData.heatmap_data[dayIndex].map((hourData, hourIndex) => (
                <div
                  key={`${day}-${hourIndex}`}
                  className="heatmap-cell"
                  style={{
                    backgroundColor: getIntensityColor(
                      hourData.stream_count,
                      heatmapData.max_values.streams,
                      'streams'
                    )
                  }}
                  onMouseEnter={() => setHoveredCell({ day, hour: hourIndex, data: hourData })}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={`${day} ${formatHour(hourIndex)}: ${hourData.stream_count} streams, ${hourData.total_minutes} min`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="legend-label">Less</span>
        <div className="legend-colors">
          <div className="legend-color" style={{ backgroundColor: 'rgba(29, 185, 84, 0.1)' }}></div>
          <div className="legend-color" style={{ backgroundColor: 'rgba(29, 185, 84, 0.3)' }}></div>
          <div className="legend-color" style={{ backgroundColor: 'rgba(29, 185, 84, 0.5)' }}></div>
          <div className="legend-color" style={{ backgroundColor: 'rgba(29, 185, 84, 0.7)' }}></div>
          <div className="legend-color" style={{ backgroundColor: 'rgba(29, 185, 84, 0.9)' }}></div>
        </div>
        <span className="legend-label">More</span>
      </div>

      {/* Summary stats */}
      {heatmapData.summary && (
        <div className="heatmap-summary">
          <div className="summary-stat">
            <span className="stat-label">Total streams:</span>
            <span className="stat-value">{heatmapData.summary.total_streams.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {hoveredCell && (
        <div className="heatmap-tooltip-overlay">
          {formatTooltipContent(hoveredCell.day, hoveredCell.hour, hoveredCell.data)}
        </div>
      )}
    </div>
  );
}