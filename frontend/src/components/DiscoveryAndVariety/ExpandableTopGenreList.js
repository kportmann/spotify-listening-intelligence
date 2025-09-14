import React, { useState, useMemo } from 'react';
import './ExpandableTopGenreList.css';

export default function ExpandableTopGenreList({ items = [], totalDistinct = null }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const displayItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="expandable-list-container">
      <div className="expandable-list-header">
        <h3 className="expandable-list-title">Top 40 of All Genres {typeof totalDistinct === 'number' ? ` (${totalDistinct})` : ''}</h3>
      </div>

      <div className="expandable-list-content">
        <ul className="gs-list">
          {displayItems.map((g) => (
            <li key={g.genre} className="gs-item">
              <div className="gs-row">
                <div className="gs-genre">{g.genre}</div>
                <div className="gs-meta">
                  <span className="gs-share">{g.share_pct?.toFixed(1)}%</span>
                  <span className="gs-dot">•</span>
                  <span className="gs-mins">{new Intl.NumberFormat().format(g.total_minutes || Math.round((g.total_ms || 0) / 60000))} min</span>
                  <span className="gs-dot">•</span>
                  <span className="gs-count">{new Intl.NumberFormat().format(g.stream_count || 0)} plays</span>
                </div>
              </div>
              <div className="gs-bar">
                <div
                  className="gs-bar-fill"
                  style={{ width: `${Math.min(100, g.share_pct || 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {totalPages > 1 && (
        <div className="gs-pager" role="navigation" aria-label="Genres pages">
          <button
            type="button"
            className="gs-page-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                type="button"
                className={p === page ? 'gs-page-btn active' : 'gs-page-btn'}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            );
          })}
          <button
            type="button"
            className="gs-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}


