import React, { useMemo } from 'react';
import './WorldListeningMap.css';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import SectionDescription from '../common/SectionDescription/SectionDescription';
import WorldMap from 'react-svg-worldmap';
import { useWorldListeningMap } from '../../hooks/useDiscoveryAndVariety';

export default function WorldListeningMap({ year = null }) {
  const { data, loading, error } = useWorldListeningMap(year);

  const worldmapData = useMemo(() => {
    if (!data || !data.countries) return [];
    return data.countries.map((c) => ({ country: c.country?.toLowerCase(), value: c.stream_count }));
  }, [data]);

  // Compute max value for dynamic color scaling
  const maxValue = useMemo(() => {
    if (!worldmapData.length) return 0;
    return worldmapData.reduce((m, d) => (d.value > m ? d.value : m), 0);
  }, [worldmapData]);

  // Style countries based on their value (opacity scale of Spotify green)
  const countryStyleFn = useMemo(() => {
    return ({ countryValue }) => {
      if (!countryValue || !maxValue) {
        return {
          fill: 'transparent',
          stroke: '#8a8a8a',
          strokeWidth: 0.5,
          strokeOpacity: 0.5,
          vectorEffect: 'non-scaling-stroke',
          cursor: 'default',
        };
      }
      const ratio = Math.max(0, Math.min(1, countryValue / maxValue));
      const alpha = 0.25 + ratio * 0.75; // 0.25 .. 1.0
      return {
        fill: `rgba(29, 185, 84, ${alpha.toFixed(3)})`, // Spotify green with dynamic opacity
        stroke: '#8a8a8a',
        strokeWidth: 1,
        strokeOpacity: 0.5,
        vectorEffect: 'non-scaling-stroke',
        cursor: 'default',
      };
    };
  }, [maxValue]);

  return (
    <section className="wlm-section">
      <SectionTitle title="Where you listened" />
      <SectionDescription>
        See the countries where your Spotify sessions originated{year ? ` in ${year}` : ''}.
      </SectionDescription>

      {loading && (
        <div className="wlm-loading">Loading map…</div>
      )}

      {error && !loading && (
        <div className="wlm-placeholder">
          <p>Could not load map data.</p>
        </div>
      )}

      {!loading && !error && worldmapData.length === 0 && (
        <div className="wlm-placeholder">
          <p>No listening locations found{year ? ` for ${year}` : ''}.</p>
        </div>
      )}

      {!loading && !error && worldmapData.length > 0 && (
        <div className="wlm-worldmap-container">
          <WorldMap
            color="#1DB954"
            valueSuffix=" streams"
            size={"responsive"}
            backgroundColor="transparent"
            styleFunction={countryStyleFn}
            data={worldmapData}
          />
          <div className="wlm-map-legend">
            <span className="wlm-legend-dot" /> Higher intensity indicates more streams
          </div>
        </div>
      )}
    </section>
  );
}


