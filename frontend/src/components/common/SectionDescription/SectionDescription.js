import React from 'react';
import './SectionDescription.css';

export default function SectionDescription({ children, maxWidth = 500, className = '' }) {
  return (
    <p 
      className={`section-description ${className}`} 
      style={{ maxWidth: `${maxWidth}px` }}
    >
      {children}
    </p>
  );
}