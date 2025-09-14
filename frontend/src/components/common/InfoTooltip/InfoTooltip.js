import React from 'react';
import './InfoTooltip.css';

export default function InfoTooltip({ children }) {
  return (
    <span className="info-tooltip" aria-label="More info" tabIndex={0}>
      <span className="info-icon">?</span>
      <span className="info-content" role="tooltip">
        {children}
      </span>
    </span>
  );
}


