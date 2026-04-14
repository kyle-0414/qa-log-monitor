import React, { useEffect, useState, useMemo } from 'react';
import { Clock, BarChart3, RefreshCw } from 'lucide-react';

const STEP_COLORS = {
  waitCartridge: '#6366f1',
  insert: '#3b82f6',
  stain: '#f59e0b',
  findPressPosition: '#8b5cf6',
  setupImaging: '#06b6d4',
  imaging: '#10b981',
  eject: '#ec4899',
};

const STEP_LABELS = {
  waitCartridge: 'Wait Cartridge',
  insert: 'Insert',
  stain: 'Stain',
  findPressPosition: 'Find Press',
  setupImaging: 'Setup Imaging',
  imaging: 'Imaging',
  eject: 'Eject',
};

function parseTs(ts) {
  if (!ts) return null;
  // Format: "2026/04/02 02:27:34 651959"
  const match = ts.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d+)/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s, us] = match;
  const date = new Date(+y, +mo - 1, +d, +h, +mi, +s);
  date.setMilliseconds(Math.floor(+us / 1000));
  return date;
}

function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return '--';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

function formatTime(date) {
  if (!date) return '--';
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function TimelinePage() {
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [logData, setLogData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch file list
  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.json())
      .then(files => setFileList(files.filter(f => !f.isCompressed)))
      .catch(e => setError(e.message));
  }, []);

  // Fetch log data when file selected
  useEffect(() => {
    if (!selectedFile) {
      setLogData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/logs/${selectedFile}`)
      .then(r => r.json())
      .then(data => {
        setLogData(data);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [selectedFile]);

  const processes = useMemo(() => {
    if (!logData) return [];
    // Use the processes array from the backend
    const procs = logData.processes || [];
    return procs.map(proc => {
      const steps = (proc.steps || []).map(step => {
        const start = parseTs(step.startTime);
        const end = parseTs(step.endTime);
        const duration = start && end ? end - start : null;
        return { ...step, startDate: start, endDate: end, duration };
      });
      const processStart = parseTs(proc.startTime);
      const processEnd = parseTs(proc.endTime);
      const totalDuration = processStart && processEnd ? processEnd - processStart : null;
      return { ...proc, steps, processStart, processEnd, totalDuration };
    });
  }, [logData]);

  // Compute global time range for consistent axis
  const timeRange = useMemo(() => {
    if (processes.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const proc of processes) {
      for (const step of proc.steps) {
        if (step.startDate) min = Math.min(min, step.startDate.getTime());
        if (step.endDate) max = Math.max(max, step.endDate.getTime());
      }
      if (proc.processStart) min = Math.min(min, proc.processStart.getTime());
      if (proc.processEnd) max = Math.max(max, proc.processEnd.getTime());
    }
    if (min === Infinity || max === -Infinity) return null;
    return { min, max, span: max - min };
  }, [processes]);

  // Generate axis tick marks
  const axisTicks = useMemo(() => {
    if (!timeRange || timeRange.span === 0) return [];
    const tickCount = 8;
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      const t = timeRange.min + (timeRange.span * i) / tickCount;
      ticks.push({ time: t, label: formatTime(new Date(t)) });
    }
    return ticks;
  }, [timeRange]);

  // Summary: average duration per step across all processes
  const stepSummary = useMemo(() => {
    const sums = {};
    const counts = {};
    for (const proc of processes) {
      for (const step of proc.steps) {
        if (step.duration != null) {
          sums[step.name] = (sums[step.name] || 0) + step.duration;
          counts[step.name] = (counts[step.name] || 0) + 1;
        }
      }
    }
    return Object.keys(STEP_COLORS).map(name => ({
      name,
      label: STEP_LABELS[name] || name,
      color: STEP_COLORS[name],
      avgDuration: counts[name] ? sums[name] / counts[name] : null,
      count: counts[name] || 0,
    }));
  }, [processes]);

  return (
    <div className="timeline-page">
      <div className="page-header">
        <h2><Clock size={20} /> Timeline</h2>
      </div>

      <div className="monitor-page__toolbar">
        <select
          value={selectedFile}
          onChange={e => setSelectedFile(e.target.value)}
          className="file-select"
        >
          <option value="">Select a log file...</option>
          {fileList.map(f => (
            <option key={f.filename} value={f.filename}>
              {f.filename} ({(f.size / 1024 / 1024).toFixed(1)}MB)
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="centered-message">
          <RefreshCw className="spinning" size={24} />
          <span>Parsing log file...</span>
        </div>
      )}

      {error && (
        <div className="centered-message">
          <span className="text-red">{error}</span>
        </div>
      )}

      {!selectedFile && !loading && (
        <div className="centered-message">
          <BarChart3 size={32} style={{ color: 'var(--text-dim)' }} />
          <span>Select a log file to view the process timeline</span>
        </div>
      )}

      {logData && processes.length === 0 && !loading && (
        <div className="centered-message">
          <span>No processes found in this log file</span>
        </div>
      )}

      {/* Legend */}
      {processes.length > 0 && (
        <div className="gantt-legend">
          {Object.entries(STEP_COLORS).map(([name, color]) => (
            <div key={name} className="gantt-legend__item">
              <span className="gantt-legend__swatch" style={{ background: color }} />
              <span>{STEP_LABELS[name] || name}</span>
            </div>
          ))}
          <div className="gantt-legend__item">
            <span className="gantt-legend__swatch gantt-legend__swatch--failed" />
            <span>Failed</span>
          </div>
        </div>
      )}

      {/* Gantt chart area */}
      {processes.length > 0 && timeRange && (
        <div className="gantt-container">
          {/* Axis */}
          <div className="gantt-axis">
            {axisTicks.map((tick, i) => (
              <span
                key={i}
                className="gantt-axis__tick"
                style={{ left: `${((tick.time - timeRange.min) / timeRange.span) * 100}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>

          {/* Process rows */}
          {processes.map((proc, idx) => (
            <div key={proc.id || idx} className="gantt-row">
              <div className="gantt-row__label">
                <div className="gantt-row__id" title={proc.id}>
                  {proc.id ? (proc.id.length > 16 ? proc.id.slice(0, 16) + '...' : proc.id) : `Process ${idx + 1}`}
                </div>
                <div className="gantt-row__meta">
                  <span className={`gantt-row__status gantt-row__status--${proc.state}`}>
                    {proc.state}
                  </span>
                  <span className="gantt-row__duration">{formatDuration(proc.totalDuration)}</span>
                </div>
              </div>
              <div className="gantt-bar">
                {/* Grid lines */}
                {axisTicks.map((tick, i) => (
                  <div
                    key={i}
                    className="gantt-bar__gridline"
                    style={{ left: `${((tick.time - timeRange.min) / timeRange.span) * 100}%` }}
                  />
                ))}
                {/* Step segments */}
                {proc.steps.map((step, si) => {
                  if (!step.startDate) return null;
                  const startPct = ((step.startDate.getTime() - timeRange.min) / timeRange.span) * 100;
                  const endTime = step.endDate ? step.endDate.getTime() : timeRange.max;
                  const widthPct = ((endTime - step.startDate.getTime()) / timeRange.span) * 100;
                  const isFailed = step.state === 'fail' || step.state === 'error';
                  return (
                    <div
                      key={si}
                      className={`gantt-step ${isFailed ? 'gantt-step--failed' : ''}`}
                      style={{
                        left: `${startPct}%`,
                        width: `${Math.max(widthPct, 0.3)}%`,
                        backgroundColor: STEP_COLORS[step.name] || '#6b7280',
                      }}
                      title={`${STEP_LABELS[step.name] || step.name}: ${formatDuration(step.duration)} (${step.state})`}
                    >
                      {widthPct > 6 && (
                        <span className="gantt-step__label">{STEP_LABELS[step.name] || step.name}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary table */}
      {processes.length > 0 && (
        <div className="gantt-summary">
          <div className="section-title">
            <BarChart3 size={14} />
            Step Duration Summary ({processes.length} process{processes.length > 1 ? 'es' : ''})
          </div>
          <div className="gantt-summary__table">
            <div className="gantt-summary__header">
              <span>Step</span>
              <span>Avg Duration</span>
              <span>Samples</span>
            </div>
            {stepSummary.map(s => (
              <div key={s.name} className="gantt-summary__row">
                <span className="gantt-summary__step">
                  <span className="gantt-legend__swatch" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="gantt-summary__value">
                  {s.avgDuration != null ? formatDuration(Math.round(s.avgDuration)) : '--'}
                </span>
                <span className="gantt-summary__count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
