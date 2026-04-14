import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText, RefreshCw, Loader2, ChevronDown, ChevronRight,
  Clipboard, Download, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';

// ── Helpers ──

function parseTimestamp(ts) {
  if (!ts) return null;
  // Format: "2026/04/02 02:27:34 123" or similar
  const cleaned = ts.replace(/\s+\d+$/, '').replace(/\//g, '-');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function formatDuration(startTs, endTs) {
  const start = parseTimestamp(startTs);
  const end = parseTimestamp(endTs);
  if (!start || !end) return '--';
  const diffMs = end - start;
  if (diffMs < 0) return '--';
  const totalSec = Math.round(diffMs / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m ${sec.toString().padStart(2, '0')}s`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m ${sec.toString().padStart(2, '0')}s`;
}

function formatDurationRaw(startTs, endTs) {
  const start = parseTimestamp(startTs);
  const end = parseTimestamp(endTs);
  if (!start || !end) return '--';
  const diffMs = end - start;
  if (diffMs < 0) return '--';
  const totalSec = Math.round(diffMs / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec.toString().padStart(2, '0')}s`;
}

function formatDate(ts) {
  if (!ts) return '--';
  return ts.replace(/\s+\d+$/, '').replace(/\//g, '-');
}

function pad(str, len) {
  return (str || '').toString().padEnd(len);
}

// ── Report Generation ──

function buildReport(data, proc) {
  const di = data.deviceInfo || {};
  const isSuccess = proc.state === 'success';
  const totalDuration = formatDurationRaw(proc.startTime, proc.endTime);
  const date = formatDate(proc.startTime);
  const imaging = proc.imaging || {};
  const pct = imaging.totalSpots > 0
    ? ((imaging.obtainedSpots / imaging.totalSpots) * 100).toFixed(1)
    : '0';
  const avgTime = imaging.avgMs != null ? `${imaging.avgMs}ms` : '--';

  return {
    testId: proc.id || '--',
    date,
    result: isSuccess ? 'SUCCESS' : 'FAIL',
    totalDuration,
    device: {
      id: di.deviceId || '--',
      model: di.productModel || '--',
      serial: di.serialNumber || '--',
      systemSW: di.fwVersion || '--',
      cerApp: di.cerVersion || '--',
      hawk: di.hawkVersion || '--',
      shark: di.sharkVersion || '--',
    },
    steps: (proc.steps || []).map(s => ({
      name: s.name,
      duration: formatDurationRaw(s.startTime, s.endTime),
      status: s.state,
      extra: s.name === 'imaging' && imaging.obtainedSpots > 0
        ? `(${imaging.obtainedSpots.toLocaleString()}/${imaging.totalSpots.toLocaleString()} spots)`
        : null,
    })),
    imaging: {
      totalSpots: imaging.totalSpots || 0,
      obtainedSpots: imaging.obtainedSpots || 0,
      percentage: pct,
      avgTime,
    },
    errors: proc.errors || [],
    warnings: proc.warnings || [],
  };
}

function reportToText(r) {
  const SEP = '\u2550'.repeat(39);
  const lines = [];
  lines.push(SEP);
  lines.push('  TEST REPORT');
  lines.push(SEP);
  lines.push(`Test ID:    ${r.testId}`);
  lines.push(`Date:       ${r.date}`);
  lines.push(`Result:     ${r.result}`);
  lines.push(`Duration:   ${r.totalDuration}`);
  lines.push('');
  lines.push('\u2500\u2500 Device Info \u2500\u2500');
  lines.push(`Device:     ${r.device.id} (${r.device.model})`);
  lines.push(`System SW:  ${r.device.systemSW}`);
  lines.push(`CER App:    ${r.device.cerApp}`);
  lines.push(`Hawk:       ${r.device.hawk}`);
  lines.push(`Shark:      ${r.device.shark}`);
  lines.push('');
  lines.push('\u2500\u2500 Steps \u2500\u2500');
  for (const s of r.steps) {
    const icon = s.status === 'success' ? '\u2705' : s.status === 'fail' ? '\u274C' : '\u2B55';
    const extra = s.extra ? ` ${s.extra}` : '';
    lines.push(`${pad(s.name, 18)}${pad(s.duration, 11)}${icon}${extra}`);
  }
  lines.push('');
  lines.push(`\u2500\u2500 Imaging \u2500\u2500`);
  lines.push(`Total Spots:     ${r.imaging.totalSpots.toLocaleString()}`);
  lines.push(`Obtained:        ${r.imaging.obtainedSpots.toLocaleString()} (${r.imaging.percentage}%)`);
  lines.push(`Avg Time/Spot:   ${r.imaging.avgTime}`);
  lines.push('');
  lines.push(`\u2500\u2500 Errors (${r.errors.length}) \u2500\u2500`);
  if (r.errors.length === 0) {
    lines.push('None');
  } else {
    for (const e of r.errors) {
      const ts = e.timestamp ? e.timestamp.replace(/\s+\d+$/, '').substring(11) : '';
      lines.push(`[${ts}] ${(e.message || '').substring(0, 200)}`);
    }
  }
  if (r.warnings.length > 0) {
    lines.push('');
    lines.push(`\u2500\u2500 Warnings (${r.warnings.length}) \u2500\u2500`);
    for (const w of r.warnings) {
      const ts = w.timestamp ? w.timestamp.replace(/\s+\d+$/, '').substring(11) : '';
      lines.push(`[${ts}] ${(w.message || '').substring(0, 200)}`);
    }
  }
  lines.push('');
  lines.push(SEP);
  return lines.join('\n');
}

// ── Components ──

function CollapsibleSection({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="report-collapsible">
      <button className="report-collapsible__toggle" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{title}</span>
        {count != null && (
          <span className={`report-collapsible__count ${count > 0 ? 'report-collapsible__count--has' : ''}`}>
            {count}
          </span>
        )}
      </button>
      {open && <div className="report-collapsible__body">{children}</div>}
    </div>
  );
}

function ReportView({ report }) {
  const [copied, setCopied] = useState(false);

  const textContent = useMemo(() => reportToText(report), [report]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = textContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${report.testId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSuccess = report.result === 'SUCCESS';

  return (
    <div className="report-card">
      {/* Header */}
      <div className="report-header">
        <div className="report-header__info">
          <h3 className="report-header__test-id">{report.testId}</h3>
          <span className="report-header__date">{report.date}</span>
        </div>
        <div className={`report-header__badge ${isSuccess ? 'report-header__badge--success' : 'report-header__badge--fail'}`}>
          {isSuccess ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {report.result}
        </div>
        <div className="report-header__duration">
          {report.totalDuration}
        </div>
      </div>

      {/* Device Info */}
      <div className="report-section">
        <h4 className="report-section__title">Device Info</h4>
        <div className="report-section__grid">
          <div className="report-info-row">
            <span className="report-info-row__label">Device ID</span>
            <span className="report-info-row__value">{report.device.id}</span>
          </div>
          <div className="report-info-row">
            <span className="report-info-row__label">Model</span>
            <span className="report-info-row__value">{report.device.model}</span>
          </div>
          <div className="report-info-row">
            <span className="report-info-row__label">Serial</span>
            <span className="report-info-row__value">{report.device.serial}</span>
          </div>
          <div className="report-info-row">
            <span className="report-info-row__label">System SW</span>
            <span className="report-info-row__value">{report.device.systemSW}</span>
          </div>
          <div className="report-info-row">
            <span className="report-info-row__label">CER App</span>
            <span className="report-info-row__value">{report.device.cerApp}</span>
          </div>
          <div className="report-info-row">
            <span className="report-info-row__label">Hawk</span>
            <span className="report-info-row__value">{report.device.hawk}</span>
          </div>
          <div className="report-info-row">
            <span className="report-info-row__label">Shark</span>
            <span className="report-info-row__value">{report.device.shark}</span>
          </div>
        </div>
      </div>

      {/* Step Summary */}
      <div className="report-section">
        <h4 className="report-section__title">Step Summary</h4>
        <table className="report-table">
          <thead>
            <tr>
              <th>Step Name</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {report.steps.map((s, i) => (
              <tr key={i}>
                <td>{s.name}</td>
                <td>{s.duration}</td>
                <td>
                  <span className={`report-status ${s.status === 'success' ? 'report-status--success' : s.status === 'fail' ? 'report-status--fail' : 'report-status--pending'}`}>
                    {s.status === 'success' ? <CheckCircle size={13} /> : s.status === 'fail' ? <XCircle size={13} /> : null}
                    {s.status}
                    {s.extra && <span className="report-status__extra">{s.extra}</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Imaging Summary */}
      <div className="report-section">
        <h4 className="report-section__title">Imaging Summary</h4>
        <div className="report-imaging-stats">
          <div className="report-imaging-stat">
            <span className="report-imaging-stat__label">Total Spots</span>
            <span className="report-imaging-stat__value">{report.imaging.totalSpots.toLocaleString()}</span>
          </div>
          <div className="report-imaging-stat">
            <span className="report-imaging-stat__label">Obtained</span>
            <span className="report-imaging-stat__value">{report.imaging.obtainedSpots.toLocaleString()}</span>
          </div>
          <div className="report-imaging-stat">
            <span className="report-imaging-stat__label">Percentage</span>
            <span className="report-imaging-stat__value">{report.imaging.percentage}%</span>
          </div>
          <div className="report-imaging-stat">
            <span className="report-imaging-stat__label">Avg Time/Spot</span>
            <span className="report-imaging-stat__value">{report.imaging.avgTime}</span>
          </div>
        </div>
      </div>

      {/* Errors */}
      <div className="report-section">
        <CollapsibleSection title="Errors" count={report.errors.length} defaultOpen={report.errors.length > 0 && report.errors.length <= 10}>
          {report.errors.length === 0 ? (
            <div className="report-empty">No errors</div>
          ) : (
            <div className="report-error-list">
              {report.errors.map((e, i) => (
                <div key={i} className="report-error-item">
                  <span className="report-error-item__time">
                    {e.timestamp ? e.timestamp.replace(/\s+\d+$/, '').substring(11) : ''}
                  </span>
                  <span className="report-error-item__msg">{(e.message || '').substring(0, 300)}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Warnings */}
      <div className="report-section">
        <CollapsibleSection title="Warnings" count={report.warnings.length}>
          {report.warnings.length === 0 ? (
            <div className="report-empty">No warnings</div>
          ) : (
            <div className="report-error-list">
              {report.warnings.map((w, i) => (
                <div key={i} className="report-error-item report-error-item--warning">
                  <span className="report-error-item__time">
                    {w.timestamp ? w.timestamp.replace(/\s+\d+$/, '').substring(11) : ''}
                  </span>
                  <span className="report-error-item__msg">{(w.message || '').substring(0, 300)}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Action Buttons */}
      <div className="report-actions">
        <button className="btn btn--primary" onClick={handleCopy}>
          <Clipboard size={14} />
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <button className="btn" onClick={handleDownload}>
          <Download size={14} />
          Download as Text
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function ReportsPage() {
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [logData, setLogData] = useState(null);
  const [selectedProcessIdx, setSelectedProcessIdx] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const fetchFiles = () => {
    setLoading(true);
    fetch('/api/logs')
      .then(r => r.json())
      .then(files => setFileList(files.filter(f => !f.isCompressed)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFiles(); }, []);

  const hasMultipleProcesses = logData && logData.processes && logData.processes.length > 1;

  const handleGenerate = () => {
    if (!selectedFile) return;
    setGenerating(true);
    setReport(null);
    setError(null);
    setLogData(null);
    setSelectedProcessIdx(0);

    fetch(`/api/logs/${encodeURIComponent(selectedFile)}`)
      .then(r => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then(data => {
        setLogData(data);
        if (!data.processes || data.processes.length === 0) {
          setError('No processes found in this log file.');
          return;
        }
        // Auto-select the first process and generate report
        const proc = data.processes[0];
        setReport(buildReport(data, proc));
      })
      .catch(err => setError(err.message))
      .finally(() => setGenerating(false));
  };

  const handleProcessChange = (idx) => {
    setSelectedProcessIdx(idx);
    if (logData && logData.processes[idx]) {
      setReport(buildReport(logData, logData.processes[idx]));
    }
  };

  return (
    <div className="report-page">
      <div className="page-header">
        <h2><FileText size={20} /> Test Reports</h2>
        <button className="btn btn--ghost" onClick={fetchFiles}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      <div className="report-page__toolbar">
        <select
          value={selectedFile}
          onChange={e => {
            setSelectedFile(e.target.value);
            setLogData(null);
            setReport(null);
            setError(null);
          }}
          className="file-select"
        >
          <option value="">Select a log file...</option>
          {fileList.map(f => (
            <option key={f.filename} value={f.filename}>
              {f.filename} ({(f.size / 1024 / 1024).toFixed(1)}MB)
            </option>
          ))}
        </select>

        {hasMultipleProcesses && (
          <select
            value={selectedProcessIdx}
            onChange={e => handleProcessChange(parseInt(e.target.value))}
            className="file-select report-page__process-select"
          >
            {logData.processes.map((p, i) => (
              <option key={i} value={i}>
                Process {i + 1}: {p.id} ({p.state})
              </option>
            ))}
          </select>
        )}

        <button
          className="btn btn--primary"
          onClick={handleGenerate}
          disabled={!selectedFile || generating}
        >
          {generating ? <Loader2 size={14} className="spinning" /> : <FileText size={14} />}
          Generate Report
        </button>
      </div>

      {generating && (
        <div className="centered-message">
          <Loader2 size={24} className="spinning" />
          <span>Generating report...</span>
        </div>
      )}

      {error && (
        <div className="report-error-banner">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {report && !generating && <ReportView report={report} />}

      {!report && !generating && !error && (
        <div className="centered-message text-dim">
          <FileText size={32} />
          <span>Select a log file and click Generate Report</span>
        </div>
      )}
    </div>
  );
}
