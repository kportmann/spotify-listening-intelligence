import React, { useState, useEffect } from 'react';
import './ListeningHeatmap.css';
import { listeningPatternsService } from '../../services/listeningPatternsService';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import SectionDescription from '../common/SectionDescription/SectionDescription';

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
      <SectionTitle title="Listening Activity Heatmap" />
      
      <div className="heatmap-section">
        <SectionDescription>
          Your listening patterns by day of week and time of day{selectedYear && ` for ${selectedYear}`} - each ring represents a day, segments show hourly activity
        </SectionDescription>
      </div>

      <div className="heatmap-header">
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

      <div className="circular-heatmap-container">
        <svg className="circular-heatmap" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
          {/* Hour labels around the outside */}
          {Array.from({ length: 24 }, (_, hour) => {
            const angle = (hour * 15 - 90) * Math.PI / 180; // 15 degrees per hour, start at top
            const labelRadius = 180;
            const x = 200 + Math.cos(angle) * labelRadius;
            const y = 200 + Math.sin(angle) * labelRadius;
            
            return hour % 3 === 0 ? (
              <text
                key={`hour-${hour}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="hour-label-text"
                fontSize="10"
                fill="#b3b3b3"
              >
                {formatHour(hour).replace(' ', '')}
              </text>
            ) : null;
          })}

          {/* Day rings and hour segments */}
          {heatmapData.day_names.map((day, dayIndex) => {
            const innerRadius = 40 + dayIndex * 18;
            const outerRadius = innerRadius + 16;
            
            return (
              <g key={day}>
                {/* Day label */}
                <text
                  x="200"
                  y={200 - innerRadius - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="day-label-text"
                  fontSize="11"
                  fill="#ffffff"
                  fontWeight="500"
                >
                  {day.substring(0, 3)}
                </text>

                {/* Hour segments for this day */}
                {heatmapData.heatmap_data[dayIndex].map((hourData, hourIndex) => {
                  const startAngle = (hourIndex * 15 - 90) * Math.PI / 180;
                  const endAngle = ((hourIndex + 1) * 15 - 90) * Math.PI / 180;
                  
                  const x1 = 200 + Math.cos(startAngle) * innerRadius;
                  const y1 = 200 + Math.sin(startAngle) * innerRadius;
                  const x2 = 200 + Math.cos(endAngle) * innerRadius;
                  const y2 = 200 + Math.sin(endAngle) * innerRadius;
                  const x3 = 200 + Math.cos(endAngle) * outerRadius;
                  const y3 = 200 + Math.sin(endAngle) * outerRadius;
                  const x4 = 200 + Math.cos(startAngle) * outerRadius;
                  const y4 = 200 + Math.sin(startAngle) * outerRadius;
                  
                  const pathData = `M ${x1} ${y1} A ${innerRadius} ${innerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${outerRadius} ${outerRadius} 0 0 0 ${x4} ${y4} Z`;
                  
                  return (
                    <path
                      key={`${day}-${hourIndex}`}
                      d={pathData}
                      fill={getIntensityColor(
                        hourData.stream_count,
                        heatmapData.max_values.streams,
                        'streams'
                      )}
                      stroke="#282828"
                      strokeWidth="0.5"
                      className="heatmap-segment"
                      onMouseEnter={(e) => {
                        setHoveredCell({ day, hour: hourIndex, data: hourData });
                        e.target.style.stroke = '#1db954';
                        e.target.style.strokeWidth = '2';
                        e.target.style.filter = 'drop-shadow(0 0 8px rgba(29, 185, 84, 0.6))';
                      }}
                      onMouseLeave={(e) => {
                        setHoveredCell(null);
                        e.target.style.stroke = '#282828';
                        e.target.style.strokeWidth = '0.5';
                        e.target.style.filter = 'none';
                      }}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease'
                      }}
                    >
                      <title>{`${day} ${formatHour(hourIndex)}: ${hourData.stream_count} streams, ${hourData.total_minutes} min`}</title>
                    </path>
                  );
                })}
              </g>
            );
          })}

          {/* Center circle with summary info */}
          <circle
            cx="200"
            cy="200"
            r="35"
            fill="#1a1a1a"
            stroke="#3e3e3e"
            strokeWidth="2"
          />
          <text
            x="200"
            y="195"
            textAnchor="middle"
            dominantBaseline="middle"
            className="center-label"
            fontSize="9"
            fill="#b3b3b3"
          >
            Total Streams
          </text>
          <text
            x="200"
            y="208"
            textAnchor="middle"
            dominantBaseline="middle"
            className="center-value"
            fontSize="12"
            fill="#1db954"
            fontWeight="600"
          >
            {heatmapData.summary?.total_streams?.toLocaleString() || '0'}
          </text>
        </svg>
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


      {/* Tooltip */}
      {hoveredCell && (
        <div className="heatmap-tooltip-overlay">
          {formatTooltipContent(hoveredCell.day, hoveredCell.hour, hoveredCell.data)}
        </div>
      )}
    </div>
  );
}