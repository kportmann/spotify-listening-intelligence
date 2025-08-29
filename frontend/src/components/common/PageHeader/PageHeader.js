import React from 'react';
import './PageHeader.css';

export default function PageHeader({ title, description }) {
  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      {description && (
        <p className="page-description">
          {description}
        </p>
      )}
    </div>
  );
}