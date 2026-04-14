import React from 'react';

export default function SvgBarChart({ bars = [], maxValue, height = 180, labelWidth = 120 }) {
  const max = maxValue || Math.max(1, ...bars.map(b => b.value || 0));
  const barH = Math.max(12, Math.floor((height - bars.length * 4) / Math.max(bars.length, 1)));
  const totalH = bars.length * (barH + 4);
  const chartW = 400;

  return (
    <svg
      viewBox={`0 0 ${labelWidth + chartW + 60} ${totalH}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {bars.map((bar, i) => {
        const y = i * (barH + 4);
        const w = max > 0 ? (bar.value / max) * chartW : 0;
        return (
          <g key={i}>
            <text x={labelWidth - 6} y={y + barH / 2 + 4} textAnchor="end" fontSize={11} fill="var(--text-secondary)" fontFamily="inherit">
              {bar.label}
            </text>
            <rect x={labelWidth} y={y} width={Math.max(w, 2)} height={barH} rx={2} fill={bar.color || '#6366f1'} opacity={0.85} />
            <text x={labelWidth + Math.max(w, 2) + 6} y={y + barH / 2 + 4} fontSize={11} fill="var(--text-secondary)" fontFamily="inherit">
              {bar.valueLabel || bar.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
