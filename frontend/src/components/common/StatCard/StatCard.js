import './StatCard.css';

function StatCard({ title, value, subtitle }) {
  return (
    <div className="stat-card">
      <h3 className="stat-title">{title}</h3>
      <div className="stat-value">{value}</div>
      {subtitle && <p className="stat-subtitle">{subtitle}</p>}
    </div>
  );
}

export default StatCard;