import React, { useMemo } from 'react';
import './RadarChart.css';

// Simple SVG radar/spider chart without external libraries.
// Props:
// - data: Array<{ label: string, value: number }>
// - size: outer square size in px (uses viewBox, responsive by CSS)
// - levels: number of concentric grid rings
// - maxValue: optional domain max; if not provided, uses max(data.value) or 1
// - showPoints: draw vertices as small circles
// - className: optional extra class
export default function RadarChart({
  data = [],
  size = 160,
  levels = 5,
  maxValue,
  showPoints = true,
  className = '',
}) {
  const cleaned = useMemo(() => (data || []).filter(d => d && typeof d.value === 'number' && d.label), [data]);
  const n = cleaned.length;
  const maxVal = useMemo(() => {
    if (typeof maxValue === 'number' && maxValue > 0) return maxValue;
    const mv = cleaned.reduce((m, d) => (d.value > m ? d.value : m), 0);
    return mv > 0 ? mv : 1;
  }, [cleaned, maxValue]);

  const center = size / 2;
  const margin = 28; // room for labels
  const radius = center - margin;

  const angleForIndex = (i) => {
    // start at -90deg (top), go clockwise
    return (-Math.PI / 2) + (2 * Math.PI * i / n);
  };

  const toXY = (value, i) => {
    const angle = angleForIndex(i);
    const r = radius * Math.max(0, Math.min(1, value / maxVal));
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const gridPolygons = useMemo(() => {
    const arr = [];
    for (let l = 1; l <= levels; l += 1) {
      const levelRatio = l / levels;
      const points = [];
      for (let i = 0; i < n; i += 1) {
        const angle = angleForIndex(i);
        const r = radius * levelRatio;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      arr.push(points.join(' '));
    }
    return arr;
  }, [n, levels, radius, center]);

  const axes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < n; i += 1) {
      const { x, y } = toXY(maxVal, i);
      arr.push({ x1: center, y1: center, x2: x, y2: y });
    }
    return arr;
  }, [n, center, maxVal]);

  const areaPoints = useMemo(() => {
    if (n === 0) return '';
    const pts = [];
    for (let i = 0; i < n; i += 1) {
      const { x, y } = toXY(cleaned[i].value, i);
      pts.push(`${x},${y}`);
    }
    return pts.join(' ');
  }, [n, cleaned]);

  const labels = useMemo(() => {
    const arr = [];
    const labelRadius = radius + 10;
    for (let i = 0; i < n; i += 1) {
      const angle = angleForIndex(i);
      const x = center + labelRadius * Math.cos(angle);
      const y = center + labelRadius * Math.sin(angle);
      let anchor = 'middle';
      if (Math.cos(angle) > 0.2) anchor = 'start';
      else if (Math.cos(angle) < -0.2) anchor = 'end';
      arr.push({ x, y, anchor, text: cleaned[i].label });
    }
    return arr;
  }, [n, radius, center, cleaned]);

  return (
    <div className={`radar-chart ${className}`}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Top genres spider chart">
        {/* Grid rings */}
        <g className="radar-grid">
          {gridPolygons.map((points, idx) => (
            <polygon key={idx} points={points} />
          ))}
        </g>

        {/* Axes */}
        <g className="radar-axes">
          {axes.map((a, idx) => (
            <line key={idx} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
          ))}
        </g>

        {/* Data area */}
        {n > 2 && (
          <polygon className="radar-area" points={areaPoints} />
        )}

        {/* Points */}
        {showPoints && (
          <g className="radar-points">
            {cleaned.map((d, i) => {
              const { x, y } = toXY(d.value, i);
              return <circle key={d.label} cx={x} cy={y} r={3} />;
            })}
          </g>
        )}

        {/* Labels */}
        <g className="radar-labels">
          {labels.map((l, idx) => (
            <text key={idx} x={l.x} y={l.y} textAnchor={l.anchor} dominantBaseline="middle">
              {l.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}


