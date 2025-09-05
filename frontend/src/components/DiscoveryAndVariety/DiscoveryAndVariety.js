import React, { useState } from 'react';
import './DiscoveryAndVariety.css';
import PageHeader from '../common/PageHeader/PageHeader';
import TimePeriodSelector from '../common/TimePeriodSelector/TimePeriodSelector';


export default function DiscoveryAndVariety() {
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');

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
    </div>
  );
}