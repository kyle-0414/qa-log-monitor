import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Grid3X3, RefreshCw } from 'lucide-react';

const FILTER_MODES = [
  { key: 'all', label: 'All' },
  { key: 'detected', label: 'Detected' },
  { key: 'no-detect', label: 'No Detection' },
  { key: 'af-fail', label: 'AF Retry (≥2)' },
  { key: 'timing', label: 'Timing Variance' },
];

function parseTs(ts) {
  if (!ts) return null;
  const m = ts.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d+)/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]);
  d.setMilliseconds(Math.floor(+m[7] / 1000));
  return d.getTime();
}

function timingColor(delta, avg) {
  if (!delta || !avg) return null;
  const ratio = delta / avg;
  // green (120) → yellow (60) → red (0)
  const hue = Math.max(0, Math.min(120, 120 - (ratio - 0.5) * 80));
  return `hsl(${hue}, 70%, 45%)`;
}

export default function HeatmapPage() {
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoveredSpot, setHoveredSpot] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [filterMode, setFilterMode] = useState('all');

  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.json())
      .then(files => setFileList(files.filter(f => !f.isCompressed)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    setLoading(true);
    setParsedData(null);
    setSelectedProcess(0);
    setSelectedSpot(null);
    setFilterMode('all');
    fetch(`/api/logs/${selectedFile}`)
      .then(r => r.json())
      .then(data => { setParsedData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedFile]);

  const processes = parsedData?.processes || [];
  const currentProcess = processes[selectedProcess] || null;
  const spots = currentProcess?.imaging?.spots || [];
  const totalSpots = currentProcess?.imaging?.totalSpots || 0;
  const intervalX = currentProcess?.imaging?.imagingIntervalX;
  const intervalY = currentProcess?.imaging?.imagingIntervalY;
  const avgMs = currentProcess?.imaging?.avgMs;

  // Compute per-spot timing deltas
  const spotTimingMap = useMemo(() => {
    if (spots.length < 2) return new Map();
    const sorted = [...spots].filter(s => s.timestamp).sort((a, b) => parseTs(a.timestamp) - parseTs(b.timestamp));
    const map = new Map();
    for (let i = 1; i < sorted.length; i++) {
      const delta = parseTs(sorted[i].timestamp) - parseTs(sorted[i-1].timestamp);
      map.set(sorted[i].index, delta);
    }
    return map;
  }, [spots]);

  const gridInfo = useMemo(() => {
    if (spots.length === 0) return null;
    const xCoords = [...new Set(spots.map(s => s.x))].sort((a, b) => a - b);
    const yCoords = [...new Set(spots.map(s => s.y))].sort((a, b) => a - b);
    if (xCoords.length === 0 || yCoords.length === 0) return null;

    const xToCol = new Map();
    xCoords.forEach((x, i) => xToCol.set(x, i));
    const yToRow = new Map();
    yCoords.forEach((y, i) => yToRow.set(y, i));

    const cols = xCoords.length;
    const rows = yCoords.length;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    for (const spot of spots) {
      const col = xToCol.get(spot.x);
      const row = yToRow.get(spot.y);
      if (col !== undefined && row !== undefined) grid[row][col] = spot;
    }

    const detectionTrue = spots.filter(s => s.detection === true).length;
    const detectionFalse = spots.filter(s => s.detection === false).length;
    const detectionNull = spots.filter(s => s.detection === null).length;
    const afFail = spots.filter(s => (s.afTimes || 1) >= 2).length;

    return { grid, rows, cols, xCoords, yCoords, detectionTrue, detectionFalse, detectionNull, afFail };
  }, [spots]);

  const handleCellHover = useCallback((spot, e) => {
    if (spot) { setHoveredSpot(spot); setTooltipPos({ x: e.clientX + 12, y: e.clientY - 10 }); }
    else setHoveredSpot(null);
  }, []);

  const getCellStyle = useCallback((spot) => {
    if (!spot) return { className: 'heatmap-cell heatmap-cell--empty', style: undefined };

    // Dim cells that don't match the filter
    if (filterMode === 'detected' && spot.detection !== true)
      return { className: 'heatmap-cell heatmap-cell--dim', style: undefined };
    if (filterMode === 'no-detect' && spot.detection !== false)
      return { className: 'heatmap-cell heatmap-cell--dim', style: undefined };
    if (filterMode === 'af-fail' && (spot.afTimes || 1) < 2)
      return { className: 'heatmap-cell heatmap-cell--dim', style: undefined };

    if (filterMode === 'timing') {
      const delta = spotTimingMap.get(spot.index);
      const color = timingColor(delta, avgMs);
      return {
        className: 'heatmap-cell',
        style: { backgroundColor: color || 'var(--bg-tertiary)' },
      };
    }

    if ((spot.afTimes || 1) >= 2 && filterMode === 'all')
      return { className: 'heatmap-cell heatmap-cell--af-fail', style: undefined };
    if (spot.detection === true) return { className: 'heatmap-cell heatmap-cell--detected', style: undefined };
    if (spot.detection === false) return { className: 'heatmap-cell heatmap-cell--no-detect', style: undefined };
    return { className: 'heatmap-cell heatmap-cell--no-data', style: undefined };
  }, [filterMode, spotTimingMap, avgMs]);

  return (
    <div className="heatmap-page">
      <div className="page-header">
        <h2><Grid3X3 size={20} /> Image Heatmap</h2>
      </div>

      <div className="monitor-page__toolbar">
        <select value={selectedFile} onChange={e => setSelectedFile(e.target.value)} className="file-select">
          <option value="">Select a log file...</option>
          {fileList.map(f => (
            <option key={f.filename} value={f.filename}>
              {f.filename} ({(f.size / 1024 / 1024).toFixed(1)}MB)
            </option>
          ))}
        </select>
        {processes.length > 1 && (
          <select
            value={selectedProcess}
            onChange={e => { setSelectedProcess(parseInt(e.target.value)); setSelectedSpot(null); }}
            className="file-select" style={{ maxWidth: 260 }}
          >
            {processes.map((p, i) => (
              <option key={i} value={i}>Process {i + 1}: {p.id} ({p.state})</option>
            ))}
          </select>
        )}
        <button className="btn btn--ghost" onClick={() => {
          fetch('/api/logs').then(r => r.json()).then(files => setFileList(files.filter(f => !f.isCompressed)));
        }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Filter buttons */}
      {gridInfo && (
        <div className="heatmap-filters">
          {FILTER_MODES.map(m => (
            <button
              key={m.key}
              className={`btn ${filterMode === m.key ? 'btn--primary' : 'btn--ghost'} heatmap-filter-btn`}
              onClick={() => setFilterMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="centered-message"><RefreshCw size={24} className="spinning" /><span>Parsing log file...</span></div>}
      {!loading && !selectedFile && <div className="centered-message"><Grid3X3 size={32} style={{ color: 'var(--text-dim)' }} /><span>Select a log file to view the imaging heatmap</span></div>}
      {!loading && selectedFile && parsedData && !gridInfo && <div className="centered-message"><span>No imaging spot data found in this log file</span></div>}

      {!loading && gridInfo && (
        <div className="heatmap-content">
          <div className="heatmap-main">
            <div className="heatmap-grid-container">
              <div className="section-title">Slide Grid ({gridInfo.cols} × {gridInfo.rows})</div>
              <div
                className="heatmap-grid"
                style={{ gridTemplateColumns: `repeat(${gridInfo.cols}, 1fr)`, gridTemplateRows: `repeat(${gridInfo.rows}, 1fr)` }}
              >
                {gridInfo.grid.flatMap((row, ri) =>
                  row.map((spot, ci) => {
                    const { className, style } = getCellStyle(spot);
                    return (
                      <div
                        key={`${ri}-${ci}`}
                        className={`${className}${selectedSpot && spot && selectedSpot.index === spot.index ? ' heatmap-cell--selected' : ''}`}
                        style={style}
                        onMouseEnter={e => handleCellHover(spot, e)}
                        onMouseMove={e => { if (spot) setTooltipPos({ x: e.clientX + 12, y: e.clientY - 10 }); }}
                        onMouseLeave={() => handleCellHover(null)}
                        onClick={() => spot && setSelectedSpot(spot)}
                      />
                    );
                  })
                )}
              </div>

              <div className="heatmap-legend">
                {filterMode !== 'timing' && filterMode !== 'af-fail' && (
                  <>
                    <div className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--detected" /><span>Detected</span></div>
                    <div className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--no-detect" /><span>No Detection</span></div>
                    <div className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--af-fail" /><span>AF Retry</span></div>
                    <div className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--no-data" /><span>Unknown</span></div>
                    <div className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--empty" /><span>Not Imaged</span></div>
                  </>
                )}
                {filterMode === 'timing' && (
                  <div className="heatmap-legend__timing">
                    <span style={{ color: 'hsl(120,70%,45%)' }}>● Fast</span>
                    <div className="heatmap-legend__gradient" />
                    <span style={{ color: 'hsl(0,70%,45%)' }}>● Slow</span>
                    {avgMs && <span className="text-dim">avg {avgMs}ms</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="heatmap-stats">
              <div className="section-title">Statistics</div>
              <div className="analysis-card">
                <h4>Imaging Progress</h4>
                <div className="analysis-row"><span>Total Spots</span><span>{totalSpots || gridInfo.cols * gridInfo.rows}</span></div>
                <div className="analysis-row"><span>Obtained</span><span>{spots.length}</span></div>
                <div className="analysis-row"><span>Percentage</span><span>{totalSpots ? ((spots.length / totalSpots) * 100).toFixed(1) : '?'}%</span></div>
                {avgMs && <div className="analysis-row"><span>Avg Interval</span><span>{avgMs}ms</span></div>}
              </div>

              <div className="analysis-card" style={{ marginTop: 12 }}>
                <h4>Detection Results</h4>
                <div className="analysis-row"><span>Detected</span><span className="text-green">{gridInfo.detectionTrue} ({spots.length ? ((gridInfo.detectionTrue/spots.length)*100).toFixed(1) : 0}%)</span></div>
                <div className="analysis-row"><span>No Detection</span><span style={{ color: 'var(--blue)' }}>{gridInfo.detectionFalse} ({spots.length ? ((gridInfo.detectionFalse/spots.length)*100).toFixed(1) : 0}%)</span></div>
                <div className="analysis-row"><span>Unknown</span><span className="text-dim">{gridInfo.detectionNull}</span></div>
                <div className="analysis-row"><span>AF Retry (≥2)</span><span style={{ color: 'var(--yellow)' }}>{gridInfo.afFail}</span></div>
              </div>

              <div className="analysis-card" style={{ marginTop: 12 }}>
                <h4>Grid Dimensions</h4>
                <div className="analysis-row"><span>Columns (X)</span><span>{gridInfo.cols}</span></div>
                <div className="analysis-row"><span>Rows (Y)</span><span>{gridInfo.rows}</span></div>
                {intervalX != null && <div className="analysis-row"><span>Interval X</span><span>{intervalX}</span></div>}
                {intervalY != null && <div className="analysis-row"><span>Interval Y</span><span>{intervalY}</span></div>}
              </div>
            </div>
          </div>

          {selectedSpot && (
            <div className="heatmap-detail">
              <div className="heatmap-detail__header">
                <div className="section-title">Spot Details</div>
                <button className="btn btn--ghost" onClick={() => setSelectedSpot(null)} style={{ padding: '2px 6px' }}>&times;</button>
              </div>
              <div className="analysis-card">
                <h4>Position</h4>
                <div className="analysis-row"><span>Index</span><span>{selectedSpot.index}</span></div>
                <div className="analysis-row"><span>X</span><span>{selectedSpot.x}</span></div>
                <div className="analysis-row"><span>Y</span><span>{selectedSpot.y}</span></div>
                {selectedSpot.slideX != null && <div className="analysis-row"><span>Slide X</span><span>{selectedSpot.slideX}</span></div>}
                {selectedSpot.slideY != null && <div className="analysis-row"><span>Slide Y</span><span>{selectedSpot.slideY}</span></div>}
              </div>
              <div className="analysis-card" style={{ marginTop: 12 }}>
                <h4>Detection / AF</h4>
                <div className="analysis-row">
                  <span>Detection</span>
                  <span className={selectedSpot.detection === true ? 'text-green' : ''} style={selectedSpot.detection === false ? { color: 'var(--blue)' } : undefined}>
                    {selectedSpot.detection === null ? 'N/A' : String(selectedSpot.detection)}
                  </span>
                </div>
                {selectedSpot.afPos != null && <div className="analysis-row"><span>AF Position</span><span>{selectedSpot.afPos}</span></div>}
                {selectedSpot.afTimes != null && (
                  <div className="analysis-row">
                    <span>AF Retries</span>
                    <span className={(selectedSpot.afTimes || 1) >= 2 ? '' : 'text-green'} style={(selectedSpot.afTimes || 1) >= 2 ? { color: 'var(--yellow)' } : undefined}>
                      {selectedSpot.afTimes}
                    </span>
                  </div>
                )}
              </div>
              {selectedSpot.timestamp && (
                <div className="analysis-card" style={{ marginTop: 12 }}>
                  <h4>Timing</h4>
                  <div className="analysis-row"><span>Timestamp</span><span>{selectedSpot.timestamp}</span></div>
                  {spotTimingMap.has(selectedSpot.index) && (
                    <div className="analysis-row"><span>Delta from prev</span><span>{spotTimingMap.get(selectedSpot.index)}ms</span></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hoveredSpot && (
        <div className="heatmap-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <div><strong>#{hoveredSpot.index}</strong></div>
          <div>X: {hoveredSpot.x}, Y: {hoveredSpot.y}</div>
          <div>Detection: {hoveredSpot.detection === null ? 'N/A' : String(hoveredSpot.detection)}</div>
          {hoveredSpot.afTimes != null && <div>AF Retries: {hoveredSpot.afTimes}</div>}
          {spotTimingMap.has(hoveredSpot.index) && <div>Delta: {spotTimingMap.get(hoveredSpot.index)}ms</div>}
        </div>
      )}
    </div>
  );
}
