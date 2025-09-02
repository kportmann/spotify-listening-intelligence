import React, { useState, useEffect } from 'react';
import './MonthlyTrends.css';
import { listeningPatternsService } from '../../services/listeningPatternsService';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import SectionDescription from '../common/SectionDescription/SectionDescription';

export default function MonthlyTrends({ selectedYear = null }) {
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimezone] = useState('UTC');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showInsights, setShowInsights] = useState(false);

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
    const chartWidth = 360;
    const chartHeight = 120;
    const leftPadding = 50;
    const rightPadding = 20;
    const topPadding = 20;
    const bottomPadding = 25;
    const innerWidth = chartWidth - leftPadding - rightPadding;
    const innerHeight = chartHeight - topPadding - bottomPadding;

    // Add 10% buffer to maxValue to ensure highest points aren't cut off
    const scaledMaxValue = maxValue * 1.1;

    const points = data.map((month, index) => {
      const x = leftPadding + (index / Math.max(1, data.length - 1)) * innerWidth;
      const value = type === 'streams' ? month.stream_count : month.total_minutes;
      const y = chartHeight - bottomPadding - ((value || 0) / scaledMaxValue) * innerHeight;
      return { x, y, value, month };
    });

    // Create line path
    const linePath = points.reduce((path, point, index) => {
      return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '');

    // Create area path (line + bottom)
    const areaPath = linePath + 
      ` L ${points[points.length - 1]?.x || leftPadding} ${chartHeight - bottomPadding}` +
      ` L ${leftPadding} ${chartHeight - bottomPadding} Z`;

    // Helper function to round up to next multiple of 10
    const roundToNext10 = (value) => {
      if (value === 0) return 0;
      return Math.ceil(value / 10) * 10;
    };

    // Create y-axis grid lines and labels using original maxValue for labels
    const yAxisSteps = 4;
    const yGridLines = [];
    const yLabels = [];
    
    for (let i = 0; i <= yAxisSteps; i++) {
      const y = chartHeight - bottomPadding - (i / yAxisSteps) * innerHeight;
      const rawValue = (i / yAxisSteps) * maxValue;
      const roundedValue = roundToNext10(rawValue);
      
      yGridLines.push({
        y,
        x1: leftPadding,
        x2: chartWidth - rightPadding
      });
      
      yLabels.push({
        y: y + 4,
        x: leftPadding - 8,
        value: roundedValue.toLocaleString()
      });
    }

    return { points, linePath, areaPath, chartWidth, chartHeight, yGridLines, yLabels };
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
        <div className="monthly-loading">
          Loading monthly patterns{selectedYear ? ` for ${selectedYear}` : ''}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monthly-trends-container">
        <div className="monthly-error">Failed to load monthly patterns: {error}</div>
      </div>
    );
  }

  if (!monthlyData?.monthly_trends || monthlyData.monthly_trends.length === 0) {
    return (
      <div className="monthly-trends-container">
        <SectionTitle title="Monthly Listening Patterns" />
        <div className="monthly-section">
          <SectionDescription>
            Your listening activity by month{selectedYear && ` for ${selectedYear}`} - track patterns
          </SectionDescription>
        </div>
        <div className="monthly-error">
          No monthly data available{selectedYear ? ` for ${selectedYear}` : ''}. 
          {selectedYear && ' Try selecting a different year or "All Time" to see your listening patterns.'}
        </div>
      </div>
    );
  }

  // Aggregate data by month across all years for all-time view
  const aggregateMonthlyData = () => {
    const monthlyAggregates = {};
    
    monthlyData.monthly_trends.forEach(month => {
      const monthKey = month.month; // Use month number as key
      if (!monthlyAggregates[monthKey]) {
        monthlyAggregates[monthKey] = {
          month: month.month,
          month_name: month.month_name,
          stream_count: 0,
          total_minutes: 0,
          year: 'All Time' // Use 'All Time' as year for display
        };
      }
      monthlyAggregates[monthKey].stream_count += month.stream_count;
      monthlyAggregates[monthKey].total_minutes += month.total_minutes;
    });

    // Calculate average minutes per stream for each month
    Object.values(monthlyAggregates).forEach(month => {
      month.avg_minutes_per_stream = month.stream_count > 0 
        ? (month.total_minutes / month.stream_count).toFixed(1) 
        : 0;
    });

    // Convert to array and sort by month
    return Object.values(monthlyAggregates).sort((a, b) => a.month - b.month);
  };

  const isAllTime = !selectedYear;
  const displayData = isAllTime ? aggregateMonthlyData() : monthlyData.monthly_trends.sort((a, b) => a.month - b.month);
  
  // Calculate max values from the display data
  const getDisplayMaxValues = () => {
    if (!displayData || displayData.length === 0) return { streams: 0, minutes: 0 };
    
    return {
      streams: Math.max(...displayData.map(m => m.stream_count)),
      minutes: Math.max(...displayData.map(m => m.total_minutes))
    };
  };

  const maxValues = getDisplayMaxValues();

  return (
    <div className="monthly-trends-container">
      <SectionTitle title="Monthly Listening Patterns" />
      
      <div className="trends-section">
        <p className="section-description">
          Your listening activity by month{selectedYear && ` for ${selectedYear}`} - track patterns
        </p>
      </div>

      <div className="trends-chart-container">
        <div className="chart-header">
        </div>

{(() => {
          // Use displayData for both single year and all-time views
          const streamsChart = createLineChart(displayData, maxValues.streams, 'streams');
          const minutesChart = createLineChart(displayData, maxValues.minutes, 'minutes');
          
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
                  
                  {/* Y-axis grid lines */}
                  {streamsChart.yGridLines.map((gridLine, index) => (
                    <line
                      key={`y-grid-${index}`}
                      x1={gridLine.x1}
                      y1={gridLine.y}
                      x2={gridLine.x2}
                      y2={gridLine.y}
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="1"
                      strokeDasharray={index === 0 ? "none" : "2,2"}
                    />
                  ))}
                  
                  {/* Y-axis labels */}
                  {streamsChart.yLabels.map((label, index) => (
                    <text
                      key={`y-label-${index}`}
                      x={label.x}
                      y={label.y}
                      textAnchor="end"
                      className="y-axis-label"
                      fill="rgba(255, 255, 255, 0.6)"
                      fontSize="8"
                    >
                      {label.value}
                    </text>
                  ))}
                  
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
                    <text key={`month-${index}`} x={point.x} y={streamsChart.chartHeight - 8} textAnchor="middle" className="month-label" fill="#b3b3b3" fontSize="9">
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
                      <stop offset="0%" stopColor="rgba(30, 136, 229, 0.4)" />
                      <stop offset="100%" stopColor="rgba(30, 136, 229, 0.1)" />
                    </linearGradient>
                  </defs>
                  
                  {/* Y-axis grid lines */}
                  {minutesChart.yGridLines.map((gridLine, index) => (
                    <line
                      key={`y-grid-${index}`}
                      x1={gridLine.x1}
                      y1={gridLine.y}
                      x2={gridLine.x2}
                      y2={gridLine.y}
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="1"
                      strokeDasharray={index === 0 ? "none" : "2,2"}
                    />
                  ))}
                  
                  {/* Y-axis labels */}
                  {minutesChart.yLabels.map((label, index) => (
                    <text
                      key={`y-label-${index}`}
                      x={label.x}
                      y={label.y}
                      textAnchor="end"
                      className="y-axis-label"
                      fill="rgba(255, 255, 255, 0.6)"
                      fontSize="8"
                    >
                      {label.value}
                    </text>
                  ))}
                  
                  <path d={minutesChart.areaPath} fill="url(#minutesGradientSingle)" className="chart-area" />
                  <path d={minutesChart.linePath} fill="none" stroke="rgb(30, 136, 229)" strokeWidth="2" className="chart-line" />
                  
                  {minutesChart.points.map((point, index) => {
                    const isActive = activeTooltip === index;
                    return (
                      <g key={`minutes-${index}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isActive ? 6 : 4}
                          fill="rgb(30, 136, 229)"
                          stroke="rgba(40, 40, 40, 0.8)"
                          strokeWidth="2"
                          className="chart-point"
                          onClick={() => handleBarClick(point.month, index)}
                          style={{ cursor: 'pointer' }}
                        />
                        {isActive && (
                          <text x={point.x} y={point.y - 12} textAnchor="middle" className="point-label" fill="#1e88e5" fontSize="10" fontWeight="600">
                            {point.month.total_minutes.toLocaleString()}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  
                  {minutesChart.points.map((point, index) => (
                    <text key={`month-${index}`} x={point.x} y={minutesChart.chartHeight - 8} textAnchor="middle" className="month-label" fill="#b3b3b3" fontSize="9">
                      {formatMonth(point.month.month_name)}
                    </text>
                  ))}
                </svg>
              </div>
              
              {/* Tooltip */}
              {activeTooltip !== null && (
                <div className="year-tooltip single-year-tooltip">
                  {(() => {
                    const activeMonth = displayData[activeTooltip];
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
        })()}
      </div>

      <div className="trends-summary">
        <div className="summary-grid">
          <div className="summary-stat">
            <div className="monthly-stat-label">{isAllTime ? 'Total Months (All Years)' : 'Total Months'}</div>
            <div className="monthly-stat-value">{isAllTime ? displayData.length : monthlyData.total_months}</div>
          </div>
          <div className="summary-stat">
            <div className="monthly-stat-label">Total Streams</div>
            <div className="monthly-stat-value">
              {displayData.reduce((sum, m) => sum + m.stream_count, 0).toLocaleString()}
            </div>
          </div>
          <div className="summary-stat">
            <div className="monthly-stat-label">Total Minutes</div>
            <div className="monthly-stat-value">
              {displayData.reduce((sum, m) => sum + m.total_minutes, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Listening Behavior Analysis */}
        <div className="listening-analysis">
          <button 
            className="show-insights-btn"
            onClick={() => setShowInsights(!showInsights)}
          >
            {showInsights ? 'Hide Analysis' : 'Show Listening Analysis'} 
            <span className={`arrow ${showInsights ? 'up' : 'down'}`}>▼</span>
          </button>
          
          {showInsights && (
            <div className="insights-content">
              <div className="insights-grid">
                {/* Peak Comparison */}
                {(() => {
                  const peakByMinutes = displayData.reduce((max, m) => 
                    m.total_minutes > max.total_minutes ? m : max, displayData[0]);
                  const peakByStreams = displayData.reduce((max, m) => 
                    m.stream_count > max.stream_count ? m : max, displayData[0]);
                  
                  return (
                    <div className="monthly-insight-card">
                      <div className="insight-header">Peak Activity Comparison</div>
                      <div className="peak-comparison">
                        <div className="peak-item">
                          <div className="peak-label">Most Minutes</div>
                          <div className="peak-value">{peakByMinutes.month_name}</div>
                          <div className="peak-detail">{peakByMinutes.total_minutes.toLocaleString()} min</div>
                        </div>
                        <div className="peak-item">
                          <div className="peak-label">Most Streams</div>
                          <div className="peak-value">{peakByStreams.month_name}</div>
                          <div className="peak-detail">{peakByStreams.stream_count.toLocaleString()} streams</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Skip Behavior Analysis */}
                {(() => {
                  const avgMinutesPerStream = displayData.map(m => ({
                    month: m.month_name,
                    avgPerStream: m.avg_minutes_per_stream
                  }));
                  
                  const highest = avgMinutesPerStream.reduce((max, m) => m.avgPerStream > max.avgPerStream ? m : max);
                  const lowest = avgMinutesPerStream.reduce((min, m) => m.avgPerStream < min.avgPerStream ? m : min);
                  
                  return (
                    <div className="monthly-insight-card">
                      <div className="insight-header">Listening Depth Analysis</div>
                      <div className="listening-depth">
                        <div className="depth-item">
                          <div className="depth-label">Deepest Listening</div>
                          <div className="depth-value">{highest.month}</div>
                          <div className="depth-detail">{highest.avgPerStream} min/stream</div>
                          <div className="depth-explanation">Longer sessions, fewer skips</div>
                        </div>
                        <div className="depth-item">
                          <div className="depth-label">Most Exploratory</div>
                          <div className="depth-value">{lowest.month}</div>
                          <div className="depth-detail">{lowest.avgPerStream} min/stream</div>
                          <div className="depth-explanation">Shorter sessions, more discovery</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="analysis-explanation">
                <p>
                  <strong>Understanding the metrics:</strong> Months with higher minutes but fewer streams suggest deeper listening sessions, 
                  while months with more streams but fewer minutes indicate more exploratory behavior or playlist shuffling.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}