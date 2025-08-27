import './HeroStats.css';

export default function HeroStats({ stats }) {
  if (!stats) {
    return null;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const daysOfHistory = stats.time_period.streaming_days;

  return (
    <div className="hero-stats">
      <div className="hero-content">
        <div className="hero-header">
          <h1 className="hero-title">Your Streaming Journey</h1>
          <div className="hero-main-stat">
            <span className="hero-time-value">{daysOfHistory}</span>
            <span className="hero-time-unit">days of history</span>
          </div>
        </div>
        
        
        {stats.time_period.first_stream && stats.time_period.last_stream && (
          <div className="hero-period">
            <div className="period-text">
              Since <strong>{formatDate(stats.time_period.first_stream)}</strong> till <strong>{formatDate(stats.time_period.last_stream)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}