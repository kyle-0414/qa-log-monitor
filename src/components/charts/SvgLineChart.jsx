import React from 'react';

export default function SvgLineChart({ data = [], color = '#6366f1', height = 120, showDots = true }) {
  if (data.length < 2) return (
    <div className="centered-message" style={{ height }}>
      <span className="text-dim">데이터 부족</span>
    </div>
  );

  const W = 600, H = height;
  const padL = 40, padR = 20, padT = 10, padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const values = data.map(d => d.y);
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const rangeY = maxY - minY || 1;

  const toX = (i) => padL + (i / (data.length - 1)) * chartW;
  const toY = (v) => padT + chartH - ((v - minY) / rangeY) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.y)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* Horizontal guide lines */}
      {[0, 0.5, 1].map((t, i) => (
        <line key={i} x1={padL} x2={W - padR} y1={padT + chartH * (1 - t)} y2={padT + chartH * (1 - t)}
          stroke="var(--border)" strokeDasharray="3 3" strokeWidth={0.5} />
      ))}
      {/* Y axis labels */}
      {[0, 0.5, 1].map((t, i) => (
        <text key={i} x={padL - 4} y={padT + chartH * (1 - t) + 4} textAnchor="end" fontSize={9} fill="var(--text-dim)" fontFamily="inherit">
          {Math.round(minY + rangeY * t)}
        </text>
      ))}

      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* Area fill */}
      <polygon
        points={`${padL},${padT + chartH} ${points} ${toX(data.length - 1)},${padT + chartH}`}
        fill={color} opacity={0.12}
      />

      {/* Dots */}
      {showDots && data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.y)} r={3} fill={color}>
          <title>{d.label}: {d.y}</title>
        </circle>
      ))}

      {/* X axis labels (sparse) */}
      {data.map((d, i) => {
        if (data.length <= 8 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
          return (
            <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--text-dim)" fontFamily="inherit">
              {d.label}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}
