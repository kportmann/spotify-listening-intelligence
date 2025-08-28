import { useState } from 'react';
import TopContentList from './TopContentList';
import './ExpandableTopList.css';

export default function ExpandableTopList({ 
  items, 
  type, 
  title, 
  loading = false, 
  error = null,
  loadingImages = false 
}) {
  const [selectedLimit, setSelectedLimit] = useState(10);
  
  if (loading) {
    return (
      <div className="expandable-list-container">
        <div className="expandable-list-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="expandable-list-container">
        <div className="expandable-list-error">Error: {error.message}</div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="expandable-list-container">
        <div className="expandable-list-no-data">No data available</div>
      </div>
    );
  }

  const displayItems = items.slice(0, selectedLimit);
  const availableLimits = [10, 40, 100].filter(limit => limit <= items.length);

  return (
    <div className="expandable-list-container">
      <div className="expandable-list-header">
        <h3 className="expandable-list-title">{title}</h3>
        
        {availableLimits.length > 1 && (
          <div className="limit-selector">
            <span className="limit-selector-label">Show:</span>
            <div className="limit-buttons">
              {availableLimits.map((limit) => (
                <button
                  key={limit}
                  className={`limit-button ${selectedLimit === limit ? 'active' : ''}`}
                  onClick={() => setSelectedLimit(limit)}
                >
                  Top {limit}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="expandable-list-content">
        <TopContentList 
          title=""
          items={displayItems}
          type={type}
          loading={false}
          error={null}
          visibleCount={selectedLimit}
          loadingImages={loadingImages}
        />
      </div>
      
      {items.length > Math.max(...availableLimits) && (
        <div className="expandable-list-footer">
          <p className="items-count">
            Showing {selectedLimit} of {items.length} items
          </p>
        </div>
      )}
    </div>
  );
}