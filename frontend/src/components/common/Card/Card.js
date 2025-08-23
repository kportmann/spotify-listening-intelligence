import './Card.css';

function Card({ title, value, period, type }) {
  return (
    <div className={`metric-card ${type}`}>
      <div className="metric-header">
        <h3>{title}</h3>
        <span className="period">{period}</span>
      </div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

export default Card;