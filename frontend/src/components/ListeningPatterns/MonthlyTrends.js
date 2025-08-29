import React, { useState, useEffect } from 'react';
import './MonthlyTrends.css';
import { listeningPatternsService } from '../../services/listeningPatternsService';
import SectionTitle from '../common/SectionTitle/SectionTitle';

export default function MonthlyTrends({ selectedYear = null }) {
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimezone] = useState('Europe/Zurich');
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    const fetchMonthlyTrends = async () => {
      try {
        setLoading(true);
        setError(null);
        setActiveTooltip(null); // Close any open tooltips when switching years
        const data = await listeningPatternsService.getMonthlyTrends(selectedYear, selectedTimezone);
        setMonthlyData(data);
      } catch (err) {
        console.error('Failed to fetch monthly trends:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyTrends();
  }, [selectedYear, selectedTimezone]);

  const getMaxValues = () => {
    if (!monthlyData?.monthly_trends) return { streams: 0, minutes: 0 };
    
    return {
      streams: Math.max(...monthlyData.monthly_trends.map(m => m.stream_count)),
      minutes: Math.max(...monthlyData.monthly_trends.map(m => m.total_minutes))
    };
  };

  const createLineChart = (data, maxValue, type = 'streams') => {
    const chartWidth = 320;
    const chartHeight = 120;
    const padding = 20;
    const innerWidth = chartWidth - 2 * padding;
    const innerHeight = chartHeight - 2 * padding;

    const points = data.map((month, index) => {
      const x = padding + (index / Math.max(1, data.length - 1)) * innerWidth;
      const value = type === 'streams' ? month.stream_count : month.total_minutes;
      const y = chartHeight - padding - ((value || 0) / maxValue) * innerHeight;
      return { x, y, value, month };
    });

    // Create line path
    const linePath = points.reduce((path, point, index) => {
      return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '');

    // Create area path (line + bottom)
    const areaPath = linePath + 
      ` L ${points[points.length - 1]?.x || padding} ${chartHeight - padding}` +
      ` L ${padding} ${chartHeight - padding} Z`;

    return { points, linePath, areaPath, chartWidth, chartHeight };
  };

  const formatMonth = (monthName) => {
    return monthName.substring(0, 3);
  };

  const handleBarClick = (month, index) => {
    setActiveTooltip(activeTooltip === index ? null : index);
  };

  const formatTooltip = (month) => {
    return {
      title: `${month.month_name} ${month.year}`,
      streams: `${month.stream_count.toLocaleString()} streams`,
      minutes: `${month.total_minutes.toLocaleString()} minutes`,
      avgPerStream: `${month.avg_minutes_per_stream} min/stream`
    };
  };

  if (loading) {
    return (
      <div className="monthly-trends-container">
        <SectionTitle title="Monthly Listening Trends" />
        <div className="trends-loading">
          Loading monthly trends{selectedYear ? ` for ${selectedYear}` : ''}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monthly-trends-container">
        <div className="trends-error">Failed to load monthly trends: {error}</div>
      </div>
    );
  }

  if (!monthlyData?.monthly_trends || monthlyData.monthly_trends.length === 0) {
    return (
      <div className="monthly-trends-container">
        <SectionTitle title="Monthly Listening Trends" />
        <div className="trends-section">
          <p className="section-description">
            Your listening activity by month{selectedYear && ` for ${selectedYear}`} - track patterns and seasonal preferences
          </p>
        </div>
        <div className="trends-error">
          No monthly data available{selectedYear ? ` for ${selectedYear}` : ''}. 
          {selectedYear && ' Try selecting a different year or "All Time" to see your listening patterns.'}
        </div>
      </div>
    );
  }

  const maxValues = getMaxValues();

  // Group months by year for better visualization when showing all-time data
  const groupMonthsByYear = () => {
    const yearGroups = {};
    monthlyData.monthly_trends.forEach(month => {
      if (!yearGroups[month.year]) {
        yearGroups[month.year] = [];
      }
      yearGroups[month.year].push(month);
    });
    return yearGroups;
  };

  const yearGroups = groupMonthsByYear();
  const years = Object.keys(yearGroups).sort((a, b) => b - a); // Sort descending (most recent first)
  const isAllTime = !selectedYear && years.length > 1;

  return (
    <div className="monthly-trends-container">
      <SectionTitle title="Monthly Listening Trends" />
      
      <div className="trends-section">
        <p className="section-description">
          Your listening activity by month{selectedYear && ` for ${selectedYear}`} - track patterns and seasonal preferences
        </p>
      </div>

      <div className="trends-chart-container">
        <div className="chart-header">
          <div className="chart-metrics">
            <div className="metric">
              <span className="metric-label">Streams</span>
              <div className="metric-legend streams-legend"></div>
            </div>
            <div className="metric">
              <span className="metric-label">Minutes</span>
              <div className="metric-legend minutes-legend"></div>
            </div>
          </div>
        </div>

        {isAllTime ? (
          // Show years stacked vertically for all-time view
          <div className="yearly-charts">
            {years.map(year => {
              const yearData = yearGroups[year].sort((a, b) => a.month - b.month);
              const streamsChart = createLineChart(yearData, maxValues.streams, 'streams');
              const minutesChart = createLineChart(yearData, maxValues.minutes, 'minutes');
              
              return (
                <div key={year} className="year-section">
                  <div className="year-header">
                    <h3 className="year-title">{year}</h3>
                    <div className="year-stats">
                      <span className="year-stat">
                        {yearGroups[year].reduce((sum, m) => sum + m.stream_count, 0).toLocaleString()} streams
                      </span>
                      <span className="year-stat">
                        {yearGroups[year].reduce((sum, m) => sum + m.total_minutes, 0).toLocaleString()} minutes
                      </span>
                    </div>
                  </div>
                  
                  <div className="line-charts-container">
                    {/* Streams Chart */}
                    <div className="line-chart-section">
                      <div className="chart-title">
                        <span className="chart-label">Streams</span>
                        <div className="chart-legend streams-legend"></div>
                      </div>
                      <svg 
                        className="line-chart" 
                        viewBox={`0 0 ${streamsChart.chartWidth} ${streamsChart.chartHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {/* Grid lines */}
                        <defs>
                          <linearGradient id={`streamsGradient-${year}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(29, 185, 84, 0.4)" />
                            <stop offset="100%" stopColor="rgba(29, 185, 84, 0.1)" />
                          </linearGradient>
                        </defs>
                        
                        {/* Area fill */}
                        <path
                          d={streamsChart.areaPath}
                          fill={`url(#streamsGradient-${year})`}
                          className="chart-area"
                        />
                        
                        {/* Line */}
                        <path
                          d={streamsChart.linePath}
                          fill="none"
                          stroke="rgb(29, 185, 84)"
                          strokeWidth="2"
                          className="chart-line"
                        />
                        
                        {/* Data points */}
                        {streamsChart.points.map((point, index) => {
                          const globalIndex = monthlyData.monthly_trends.findIndex(m => 
                            m.year === point.month.year && m.month === point.month.month);
                          const isActive = activeTooltip === globalIndex;
                          const tooltip = formatTooltip(point.month);
                          
                          return (
                            <g key={`${year}-streams-${index}`}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isActive ? 6 : 4}
                                fill="rgb(29, 185, 84)"
                                stroke="rgba(40, 40, 40, 0.8)"
                                strokeWidth="2"
                                className="chart-point"
                                onClick={() => handleBarClick(point.month, globalIndex)}
                                style={{ cursor: 'pointer' }}
                              />
                              {isActive && (
                                <text
                                  x={point.x}
                                  y={point.y - 12}
                                  textAnchor="middle"
                                  className="point-label"
                                  fill="#1db954"
                                  fontSize="10"
                                  fontWeight="600"
                                >
                                  {point.month.stream_count.toLocaleString()}
                                </text>
                              )}
                            </g>
                          );
                        })}
                        
                        {/* Month labels */}
                        {streamsChart.points.map((point, index) => (
                          <text
                            key={`${year}-month-${index}`}
                            x={point.x}
                            y={streamsChart.chartHeight - 5}
                            textAnchor="middle"
                            className="month-label"
                            fill="#b3b3b3"
                            fontSize="9"
                          >
                            {formatMonth(point.month.month_name)}
                          </text>
                        ))}
                      </svg>
                    </div>
                    
                    {/* Minutes Chart */}
                    <div className="line-chart-section">
                      <div className="chart-title">
                        <span className="chart-label">Minutes</span>
                        <div className="chart-legend minutes-legend"></div>
                      </div>
                      <svg 
                        className="line-chart" 
                        viewBox={`0 0 ${minutesChart.chartWidth} ${minutesChart.chartHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <defs>
                          <linearGradient id={`minutesGradient-${year}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(30, 215, 96, 0.4)" />
                            <stop offset="100%" stopColor="rgba(30, 215, 96, 0.1)" />
                          </linearGradient>
                        </defs>
                        
                        {/* Area fill */}
                        <path
                          d={minutesChart.areaPath}
                          fill={`url(#minutesGradient-${year})`}
                          className="chart-area"
                        />
                        
                        {/* Line */}
                        <path
                          d={minutesChart.linePath}
                          fill="none"
                          stroke="rgb(30, 215, 96)"
                          strokeWidth="2"
                          className="chart-line"
                        />
                        
                        {/* Data points */}
                        {minutesChart.points.map((point, index) => {
                          const globalIndex = monthlyData.monthly_trends.findIndex(m => 
                            m.year === point.month.year && m.month === point.month.month);
                          const isActive = activeTooltip === globalIndex;
                          
                          return (
                            <g key={`${year}-minutes-${index}`}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isActive ? 6 : 4}
                                fill="rgb(30, 215, 96)"
                                stroke="rgba(40, 40, 40, 0.8)"
                                strokeWidth="2"
                                className="chart-point"
                                onClick={() => handleBarClick(point.month, globalIndex)}
                                style={{ cursor: 'pointer' }}
                              />
                              {isActive && (
                                <text
                                  x={point.x}
                                  y={point.y - 12}
                                  textAnchor="middle"
                                  className="point-label"
                                  fill="#1ede60"
                                  fontSize="10"
                                  fontWeight="600"
                                >
                                  {point.month.total_minutes.toLocaleString()}
                                </text>
                              )}
                            </g>
                          );
                        })}
                        
                        {/* Month labels */}
                        {minutesChart.points.map((point, index) => (
                          <text
                            key={`${year}-month-${index}`}
                            x={point.x}
                            y={minutesChart.chartHeight - 5}
                            textAnchor="middle"
                            className="month-label"
                            fill="#b3b3b3"
                            fontSize="9"
                          >
                            {formatMonth(point.month.month_name)}
                          </text>
                        ))}
                      </svg>
                    </div>
                  </div>
                  
                  {/* Show tooltip if active */}
                  {activeTooltip !== null && yearData.some(month => {
                    const globalIndex = monthlyData.monthly_trends.findIndex(m => 
                      m.year === month.year && m.month === month.month);
                    return globalIndex === activeTooltip;
                  }) && (
                    <div className="year-tooltip">
                      {(() => {
                        const activeMonth = monthlyData.monthly_trends[activeTooltip];
                        const tooltip = formatTooltip(activeMonth);
                        return (
                          <div className="tooltip-content">
                            <div className="tooltip-title">{tooltip.title}</div>
                            <div className="tooltip-stats">
                              <div className="tooltip-stat">
                                <span className="tooltip-label">Streams:</span>
                                <span className="tooltip-value">{tooltip.streams}</span>
                              </div>
                              <div className="tooltip-stat">
                                <span className="tooltip-label">Minutes:</span>
                                <span className="tooltip-value">{tooltip.minutes}</span>
                              </div>
                              <div className="tooltip-stat">
                                <span className="tooltip-label">Avg/Stream:</span>
                                <span className="tooltip-value">{tooltip.avgPerStream}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Show line chart for specific year
          (() => {
            const yearData = monthlyData.monthly_trends.sort((a, b) => a.month - b.month);
            const streamsChart = createLineChart(yearData, maxValues.streams, 'streams');
            const minutesChart = createLineChart(yearData, maxValues.minutes, 'minutes');
            
            return (
              <div className="line-charts-container single-year">
                {/* Streams Chart */}
                <div className="line-chart-section">
                  <div className="chart-title">
                    <span className="chart-label">Streams</span>
                    <div className="chart-legend streams-legend"></div>
                  </div>
                  <svg 
                    className="line-chart" 
                    viewBox={`0 0 ${streamsChart.chartWidth} ${streamsChart.chartHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <linearGradient id="streamsGradientSingle" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(29, 185, 84, 0.4)" />
                        <stop offset="100%" stopColor="rgba(29, 185, 84, 0.1)" />
                      </linearGradient>
                    </defs>
                    
                    <path d={streamsChart.areaPath} fill="url(#streamsGradientSingle)" className="chart-area" />
                    <path d={streamsChart.linePath} fill="none" stroke="rgb(29, 185, 84)" strokeWidth="2" className="chart-line" />
                    
                    {streamsChart.points.map((point, index) => {
                      const isActive = activeTooltip === index;
                      return (
                        <g key={`streams-${index}`}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={isActive ? 6 : 4}
                            fill="rgb(29, 185, 84)"
                            stroke="rgba(40, 40, 40, 0.8)"
                            strokeWidth="2"
                            className="chart-point"
                            onClick={() => handleBarClick(point.month, index)}
                            style={{ cursor: 'pointer' }}
                          />
                          {isActive && (
                            <text x={point.x} y={point.y - 12} textAnchor="middle" className="point-label" fill="#1db954" fontSize="10" fontWeight="600">
                              {point.month.stream_count.toLocaleString()}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    
                    {streamsChart.points.map((point, index) => (
                      <text key={`month-${index}`} x={point.x} y={streamsChart.chartHeight - 5} textAnchor="middle" className="month-label" fill="#b3b3b3" fontSize="9">
                        {formatMonth(point.month.month_name)}
                      </text>
                    ))}
                  </svg>
                </div>
                
                {/* Minutes Chart */}
                <div className="line-chart-section">
                  <div className="chart-title">
                    <span className="chart-label">Minutes</span>
                    <div className="chart-legend minutes-legend"></div>
                  </div>
                  <svg className="line-chart" viewBox={`0 0 ${minutesChart.chartWidth} ${minutesChart.chartHeight}`} preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="minutesGradientSingle" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(30, 215, 96, 0.4)" />
                        <stop offset="100%" stopColor="rgba(30, 215, 96, 0.1)" />
                      </linearGradient>
                    </defs>
                    
                    <path d={minutesChart.areaPath} fill="url(#minutesGradientSingle)" className="chart-area" />
                    <path d={minutesChart.linePath} fill="none" stroke="rgb(30, 215, 96)" strokeWidth="2" className="chart-line" />
                    
                    {minutesChart.points.map((point, index) => {
                      const isActive = activeTooltip === index;
                      return (
                        <g key={`minutes-${index}`}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={isActive ? 6 : 4}
                            fill="rgb(30, 215, 96)"
                            stroke="rgba(40, 40, 40, 0.8)"
                            strokeWidth="2"
                            className="chart-point"
                            onClick={() => handleBarClick(point.month, index)}
                            style={{ cursor: 'pointer' }}
                          />
                          {isActive && (
                            <text x={point.x} y={point.y - 12} textAnchor="middle" className="point-label" fill="#1ede60" fontSize="10" fontWeight="600">
                              {point.month.total_minutes.toLocaleString()}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    
                    {minutesChart.points.map((point, index) => (
                      <text key={`month-${index}`} x={point.x} y={minutesChart.chartHeight - 5} textAnchor="middle" className="month-label" fill="#b3b3b3" fontSize="9">
                        {formatMonth(point.month.month_name)}
                      </text>
                    ))}
                  </svg>
                </div>
                
                {/* Tooltip */}
                {activeTooltip !== null && (
                  <div className="year-tooltip single-year-tooltip">
                    {(() => {
                      const activeMonth = monthlyData.monthly_trends[activeTooltip];
                      const tooltip = formatTooltip(activeMonth);
                      return (
                        <div className="tooltip-content">
                          <div className="tooltip-title">{tooltip.title}</div>
                          <div className="tooltip-stats">
                            <div className="tooltip-stat">
                              <span className="tooltip-label">Streams:</span>
                              <span className="tooltip-value">{tooltip.streams}</span>
                            </div>
                            <div className="tooltip-stat">
                              <span className="tooltip-label">Minutes:</span>
                              <span className="tooltip-value">{tooltip.minutes}</span>
                            </div>
                            <div className="tooltip-stat">
                              <span className="tooltip-label">Avg/Stream:</span>
                              <span className="tooltip-value">{tooltip.avgPerStream}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      <div className="trends-summary">
        <div className="summary-grid">
          <div className="summary-stat">
            <div className="stat-label">Total Months</div>
            <div className="stat-value">{monthlyData.total_months}</div>
          </div>
          <div className="summary-stat">
            <div className="stat-label">Total Streams</div>
            <div className="stat-value">
              {monthlyData.monthly_trends.reduce((sum, m) => sum + m.stream_count, 0).toLocaleString()}
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-label">Total Minutes</div>
            <div className="stat-value">
              {monthlyData.monthly_trends.reduce((sum, m) => sum + m.total_minutes, 0).toLocaleString()}
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-label">Peak Month</div>
            <div className="stat-value">
              {(() => {
                const peakMonth = monthlyData.monthly_trends.reduce((max, m) => 
                  m.stream_count > max.stream_count ? m : max, monthlyData.monthly_trends[0]);
                return `${peakMonth.month_name}`;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}