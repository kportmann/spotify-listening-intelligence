import { useEffect, useState } from 'react';
import './CostSection.css';
import { basicStatsService } from '../../services/basicStatsService';

function calculateInclusiveMonthSpan(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(0, months);
}

export default function CostSection() {
  const [firstDate, setFirstDate] = useState(null);
  const [lastDate, setLastDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOverview = async () => {
      try {
        setError(null);
        const overview = await basicStatsService.getStatsOverview();
        if (!cancelled) {
          const fs = overview?.time_period?.first_stream ? new Date(overview.time_period.first_stream) : null;
          const ls = overview?.time_period?.last_stream ? new Date(overview.time_period.last_stream) : null;
          setFirstDate(fs);
          setLastDate(ls);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOverview();
    return () => { cancelled = true; };
  }, []);

  const months = firstDate && lastDate ? calculateInclusiveMonthSpan(firstDate, lastDate) : 0;
  const monthlyPrice = 14; // CHF per month
  const totalCHF = months * monthlyPrice;
  const chf = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(totalCHF);

  return (
    <section className="wrapped-section">
      <div className="wrapped-section-content">
        <h2>Your Spotify Investment</h2>
        <p className="cost-subtitle">Estimated subscription spend over your journey (CHF 14/month)</p>
        {loading && <p>Calculating…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && (
          <div className="cost-card">
            <div className="cost-stats">
              <div className="cost-stat">
                <div className="cost-stat-value">{months}</div>
                <div className="cost-stat-label">Months</div>
              </div>
              <div className="cost-stat">
                <div className="cost-stat-value">CHF {monthlyPrice}</div>
                <div className="cost-stat-label">Per month</div>
              </div>
              <div className="cost-stat total">
                <div className="cost-stat-value total">{chf}</div>
                <div className="cost-stat-label">Estimated total</div>
              </div>
            </div>
            {firstDate && lastDate && (
              <p className="cost-range">From {firstDate.toLocaleDateString()} to {lastDate.toLocaleDateString()}</p>
            )}
          </div>
        )}
      </div>
      <div className="wrapped-scroll-indicator" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </section>
  );
}


