import { useEffect, useState } from 'react';
import SeasonContentList from './SeasonContentList';
import './ExpandableSeasonList.css';
import { useSeasonalTopContent } from '../../hooks/useListeningPatterns';

export default function ExpandableSeasonList({ selectedSeason, selectedYear = null, isExpanded = false }) {
  const { data, loading, error } = useSeasonalTopContent(selectedSeason, selectedYear, true);

  if (!selectedSeason) {
    return (
      <div className="expandable-list-container">
        <div className="expandable-list-no-data">No seasonal data available</div>
      </div>
    );
  }

  return (
    <div className="expandable-list-container">
      <div className="expandable-list-header">
        <h3 className="expandable-list-title">Season Highlights</h3>
      </div>

      <div className="expandable-list-content">
        <SeasonContentList 
          title={selectedSeason}
          data={data}
          loading={loading && !data}
          error={error}
          isExpanded={isExpanded}
        />
      </div>
    </div>
  );
}