import React, { useState, useEffect } from 'react';
import './SkipRateAnalysis.css';
import { listeningPatternsService } from '../../services/listeningPatternsService';
import SectionTitle from '../common/SectionTitle/SectionTitle';

export default function SkipRateAnalysis({ selectedYear = null }) {
  const [skipData, setSkipData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview');


  useEffect(() => {
    const fetchSkipData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listeningPatternsService.getSkipRateAnalysis(selectedYear);
        setSkipData(data);
      } catch (err) {
        console.error('Failed to fetch skip rate data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSkipData();
  }, [selectedYear]);


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
            <div className="skip-stat-value" style={{ color: getSkipRateColor(overall_stats.skip_rate) }}>
              {overall_stats.skip_rate}%
            </div>
            <div className="skip-stat-label">Skip Rate</div>
            <div className="skip-stat-detail">{overall_stats.skipped_streams.toLocaleString()} skipped</div>
          </div>

          <div className="skip-stat-card">
            <div className="skip-stat-value" style={{ color: '#1db954' }}>
              {overall_stats.completion_rate}%
            </div>
            <div className="skip-stat-label">Completion Rate</div>
            <div className="skip-stat-detail">{(overall_stats.total_streams - overall_stats.skipped_streams).toLocaleString()} completed</div>
          </div>

          <div className="skip-stat-card">
            <div className="skip-stat-value">
              {overall_stats.total_streams.toLocaleString()}
            </div>
            <div className="skip-stat-label">Total Streams</div>
            <div className="skip-stat-detail">analyzed</div>
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

            </div>
          </div>
        )}
      </div>
    );
  };


  const renderMostSkippedTracks = () => {
    if (!skipData?.track_skip_rates || skipData.track_skip_rates.length === 0) {
      return (
        <div className="tracks-analysis">
          <h4>Most Skipped Tracks</h4>
          <div className="no-data-message">
            <p>No track skip data available.</p>
            <p>This requires tracks with multiple listens to generate meaningful statistics.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="tracks-analysis">
        <h4>Most Skipped Tracks</h4>
        <div className="tracks-table-container">
          <table className="tracks-table">
            <thead>
              <tr>
                <th>Track</th>
                <th>Artist</th>
                <th>Times Skipped</th>
                <th>Skip Rate</th>
                <th>Avg Skip Position</th>
              </tr>
            </thead>
            <tbody>
              {skipData.track_skip_rates.slice(0, 20).map((track, index) => (
                <tr key={index}>
                  <td className="track-name">{track.track_name}</td>
                  <td className="artist-name">{track.artist_name}</td>
                  <td>{track.skip_count}</td>
                  <td style={{ color: getSkipRateColor(track.skip_rate) }}>
                    {track.skip_rate}%
                  </td>
                  <td>{track.avg_skip_position}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMostCompletedTracks = () => {
    if (!skipData?.completed_tracks || skipData.completed_tracks.length === 0) {
      return (
        <div className="tracks-analysis">
          <h4>Most Completed Tracks</h4>
          <div className="no-data-message">
            <p>No track completion data available.</p>
            <p>This requires tracks with multiple listens to generate meaningful statistics.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="tracks-analysis">
        <h4>Most Completed Tracks</h4>
        <div className="tracks-table-container">
          <table className="tracks-table">
            <thead>
              <tr>
                <th>Track</th>
                <th>Artist</th>
                <th>Times Played</th>
                <th>Completion Rate</th>
                <th>Avg Listen %</th>
              </tr>
            </thead>
            <tbody>
              {skipData.completed_tracks.slice(0, 20).map((track, index) => (
                <tr key={index}>
                  <td className="track-name">{track.track_name}</td>
                  <td className="artist-name">{track.artist_name}</td>
                  <td>{track.play_count}</td>
                  <td style={{ color: '#1db954' }}>
                    {track.completion_rate}%
                  </td>
                  <td>{track.avg_listen_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAdvancedInsights = () => {
    if (!skipData) return null;

    const { overall_stats, artist_skip_rates, skip_reasons } = skipData;

    return (
      <div className="advanced-insights">
        <h4>Skip Behavior Insights</h4>
        
        <div className="insights-section">
          <div className="insight-category">
            <h5>Listening Patterns</h5>
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-title">Skip Tendency</div>
                <div className="insight-value" style={{ color: getSkipRateColor(overall_stats.skip_rate) }}>
                  {overall_stats.skip_rate < 20 ? 'Low Skipper' : 
                   overall_stats.skip_rate < 40 ? 'Moderate Skipper' : 
                   overall_stats.skip_rate < 60 ? 'Frequent Skipper' : 'High Skipper'}
                </div>
                <div className="insight-detail">Based on {overall_stats.skip_rate}% skip rate</div>
              </div>

              <div className="insight-card">
                <div className="insight-title">Most Patient With</div>
                <div className="insight-value">
                  {artist_skip_rates.length > 0 ? 
                    artist_skip_rates.reduce((min, artist) => 
                      artist.skip_rate < min.skip_rate ? artist : min
                    ).artist_name : 'N/A'}
                </div>
                <div className="insight-detail">Lowest skip rate artist</div>
              </div>

              <div className="insight-card">
                <div className="insight-title">Least Patient With</div>
                <div className="insight-value">
                  {artist_skip_rates.length > 0 ? 
                    artist_skip_rates.reduce((max, artist) => 
                      artist.skip_rate > max.skip_rate ? artist : max
                    ).artist_name : 'N/A'}
                </div>
                <div className="insight-detail">Highest skip rate artist</div>
              </div>
            </div>
          </div>

          {skip_reasons && skip_reasons.length > 0 && (
            <div className="insight-category">
              <h5>Why You Skip</h5>
              <div className="skip-reasons-analysis">
                {skip_reasons.slice(0, 5).map((reason, index) => (
                  <div key={reason.reason} className="reason-analysis-item">
                    <span className="reason-name">{reason.reason}</span>
                    <div className="reason-stats">
                      <span className="reason-count">{reason.count} times</span>
                      <div className="reason-bar">
                        <div 
                          className="reason-fill"
                          style={{
                            width: `${(reason.count / skip_reasons[0].count) * 100}%`,
                            backgroundColor: '#ff6b35'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
        <div className="view-selector">
          <button
            className={`view-btn ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            Overview
          </button>
          <button
            className={`view-btn ${activeView === 'artists' ? 'active' : ''}`}
            onClick={() => setActiveView('artists')}
          >
            By Artist
          </button>
          <button
            className={`view-btn ${activeView === 'skipped-tracks' ? 'active' : ''}`}
            onClick={() => setActiveView('skipped-tracks')}
          >
            Most Skipped
          </button>
          <button
            className={`view-btn ${activeView === 'completed-tracks' ? 'active' : ''}`}
            onClick={() => setActiveView('completed-tracks')}
          >
            Most Completed
          </button>
          <button
            className={`view-btn ${activeView === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveView('insights')}
          >
            Insights
          </button>
        </div>
      </div>

      <div className="skip-content">
        {activeView === 'overview' && renderOverviewStats()}
        {activeView === 'artists' && renderArtistTable()}
        {activeView === 'skipped-tracks' && renderMostSkippedTracks()}
        {activeView === 'completed-tracks' && renderMostCompletedTracks()}
        {activeView === 'insights' && renderAdvancedInsights()}
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