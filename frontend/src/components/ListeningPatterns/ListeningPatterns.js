import './ListeningPatterns.css';

export default function ListeningPatterns() {
  return (
    <div className="listening-patterns-page">
      <div className="listening-patterns-header">
        <h1 className="page-title">Listening Patterns</h1>
        <p className="page-description">
          Discover your unique listening habits and explore detailed patterns in your music consumption.
        </p>
      </div>

      <div className="patterns-content">
        <div className="pattern-section">
          <h2 className="section-title">Coming Soon</h2>
          <div className="placeholder-content">
            <p>Your listening patterns analysis will be available here soon!</p>
            <p>This page will include:</p>
            <ul>
              <li>Listening time trends</li>
              <li>Genre preferences over time</li>
              <li>Most active listening hours</li>
              <li>Seasonal listening patterns</li>
              <li>And much more!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}