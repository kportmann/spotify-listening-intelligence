import React, { useEffect, useMemo, useState } from 'react';
import './DiscoveryAndVariety.css';
import PageHeader from '../common/PageHeader/PageHeader';
import TimePeriodSelector from '../common/TimePeriodSelector/TimePeriodSelector';
import WorldListeningMap from './WorldListeningMap';


export default function DiscoveryAndVariety() {
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');
  const selectedYear = useMemo(() => {
    return selectedPeriod === 'all_time' ? null : parseInt(selectedPeriod, 10);
  }, [selectedPeriod]);

  return (
    <div className="discovery-and-variety-page">
      <PageHeader 
        title="Discovery and Variety"
        description="Discover your unique listening habits and explore detailed patterns in your music consumption."
      />

      <TimePeriodSelector 
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <div className="patterns-content">
        <WorldListeningMap year={selectedYear} />
      </div>
    </div>
  );
}