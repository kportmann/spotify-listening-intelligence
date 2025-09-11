import React, { useMemo } from 'react';
import './WorldListeningMap.css';
import SectionTitle from '../common/SectionTitle/SectionTitle';
import SectionDescription from '../common/SectionDescription/SectionDescription';
import WorldMap from 'react-svg-worldmap';
import { useListeningGeography } from '../../hooks/useListeningGeography';

export default function WorldListeningMap({ year = null }) {
  const { data, loading, error } = useListeningGeography(year);

  const worldmapData = useMemo(() => {
    if (!data || !data.countries) return [];
    return data.countries.map((c) => ({ country: c.country?.toLowerCase(), value: c.stream_count }));
  }, [data]);

  return (
    <section className="pattern-section map-section">
      <SectionTitle title="Where you listened" />
      <SectionDescription>
        See the countries where your Spotify sessions originated{year ? ` in ${year}` : ''}.
      </SectionDescription>

      {loading && (
        <div className="listening-patterns-loading">Loading map…</div>
      )}

      {error && !loading && (
        <div className="placeholder-content">
          <p>Could not load map data.</p>
        </div>
      )}

      {!loading && !error && worldmapData.length === 0 && (
        <div className="placeholder-content">
          <p>No listening locations found{year ? ` for ${year}` : ''}.</p>
        </div>
      )}

      {!loading && !error && worldmapData.length > 0 && (
        <div className="worldmap-container">
          <WorldMap
            color="#1DB954"
            valueSuffix=" streams"
            size={"responsive"}
            data={worldmapData}
          />
          <div className="map-legend">
            <span className="legend-dot" /> Higher intensity indicates more streams
          </div>
        </div>
      )}
    </section>
  );
}


