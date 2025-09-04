import { useEffect, useState } from 'react';
import SeasonContentList from './SeasonContentList';
import './ExpandableSeasonList.css';
import { listeningPatternsService } from '../../services/listeningPatternsService';

export default function ExpandableSeasonList({ selectedSeason, selectedYear = null, isExpanded = false }) {
  const [contentBySeason, setContentBySeason] = useState({});

  useEffect(() => {
    if (!selectedSeason) return;
    let isCancelled = false;

    const fetchAll = async () => {
      // initialize loading state
      setContentBySeason((prev) => {
        const base = {};
        base[selectedSeason] = { ...(prev[selectedSeason] || {}), loading: true, error: null };
        return base;
      });

      try {
        const result = await listeningPatternsService
          .getSeasonalTopContent(selectedSeason, selectedYear, true)
          .then((data) => ({ season: selectedSeason, data }))
          .catch((err) => ({ season: selectedSeason, error: err?.message || 'Failed to load' }));

        if (isCancelled) return;
        setContentBySeason((prev) => {
          const next = { ...prev };
          next[result.season] = {
            data: result.data,
            loading: false,
            error: result.error || null,
          };
          return next;
        });
      } catch (e) {
        // handled per-season above
      }
    };

    fetchAll();

    return () => {
      isCancelled = true;
    };
  }, [selectedSeason, selectedYear]);

  if (!selectedSeason) {
    return (
      <div className="expandable-list-container">
        <div className="expandable-list-no-data">No seasonal data available</div>
      </div>
    );
  }

  const selectedState = selectedSeason ? contentBySeason[selectedSeason] : null;

  return (
    <div className="expandable-list-container">
      <div className="expandable-list-header">
        <h3 className="expandable-list-title">Season Highlights</h3>
      </div>

      <div className="expandable-list-content">
        <SeasonContentList 
          title={selectedSeason}
          data={selectedState?.data}
          loading={selectedState?.loading && !selectedState?.data}
          error={selectedState?.error}
          isExpanded={isExpanded}
        />
      </div>
    </div>
  );
}