import React, { useEffect, useState, useMemo } from 'react';
import { GitCompare, RefreshCw, Loader2 } from 'lucide-react';
import { compareLogData, formatDuration } from '../lib/compareUtils';

const STEP_COLORS = {
  waitCartridge: '#6366f1', insert: '#3b82f6', stain: '#f59e0b',
  findPressPosition: '#8b5cf6', setupImaging: '#06b6d4', imaging: '#10b981', eject: '#ec4899',
};

function FileSelector({ label, fileList, value, onChange, loading }) {
  return (
    <div className="compare-file-selector">
      <div className="compare-file-selector__label">{label}</div>
      <select
        className="file-select"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">파일 선택...</option>
        {fileList.map(f => (
          <option key={f.filename} value={f.filename}>
            {f.filename} ({(f.size / 1024 / 1024).toFixed(1)}MB)
          </option>
        ))}
      </select>
      {loading && <Loader2 size={14} className="spinning" style={{ marginLeft: 8 }} />}
    </div>
  );
}

function DurationBar({ durationA, durationB, maxMs, colorA, colorB }) {
  if (!maxMs) return null;
  const pctA = durationA != null ? (durationA / maxMs) * 100 : 0;
  const pctB = durationB != null ? (durationB / maxMs) * 100 : 0;
  return (
    <div className="compare-bars">
      <div className="compare-bar-row">
        <div className="compare-bar compare-bar--a" style={{ width: `${pctA}%`, background: colorA || '#6366f1' }} />
        <span className="compare-bar-label">{formatDuration(durationA)}</span>
      </div>
      <div className="compare-bar-row">
        <div className="compare-bar compare-bar--b" style={{ width: `${pctB}%`, background: colorB || '#3b82f6' }} />
        <span className="compare-bar-label">{formatDuration(durationB)}</span>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [fileList, setFileList] = useState([]);
  const [fileA, setFileA] = useState('');
  const [fileB, setFileB] = useState('');
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  useEffect(() => {
    fetch('/api/logs').then(r => r.json())
      .then(files => setFileList(files.filter(f => !f.isCompressed)))
      .catch(() => {});
  }, []);

  const fetchFile = (filename, setData, setLoading) => {
    if (!filename) { setData(null); return; }
    setLoading(true);
    fetch(`/api/logs/${filename}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => fetchFile(fileA, setDataA, setLoadingA), [fileA]);
  useEffect(() => fetchFile(fileB, setDataB, setLoadingB), [fileB]);

  const diff = useMemo(() => {
    if (!dataA || !dataB) return null;
    return compareLogData(dataA, dataB);
  }, [dataA, dataB]);

  const maxStepMs = useMemo(() => {
    if (!diff) return 1;
    return Math.max(1, ...diff.stepDiffs.flatMap(s => [s.durationA || 0, s.durationB || 0]));
  }, [diff]);

  const labelA = fileA ? fileA.substring(0, 20) + (fileA.length > 20 ? '…' : '') : 'File A';
  const labelB = fileB ? fileB.substring(0, 20) + (fileB.length > 20 ? '…' : '') : 'File B';

  return (
    <div className="compare-page">
      <div className="page-header">
        <h2><GitCompare size={20} /> Test Result Comparison</h2>
      </div>

      <div className="compare-selectors">
        <FileSelector label="📁 File A" fileList={fileList} value={fileA} onChange={setFileA} loading={loadingA} />
        <div className="compare-vs">VS</div>
        <FileSelector label="📁 File B" fileList={fileList} value={fileB} onChange={setFileB} loading={loadingB} />
      </div>

      {(loadingA || loadingB) && (
        <div className="centered-message"><Loader2 className="spinning" size={24} /><span>로딩 중...</span></div>
      )}

      {!diff && !loadingA && !loadingB && (
        <div className="centered-message">
          <GitCompare size={32} style={{ color: 'var(--text-dim)' }} />
          <span>비교할 로그 파일 2개를 선택하세요</span>
        </div>
      )}

      {diff && (
        <div className="compare-content">
          {/* Overall */}
          <div className="compare-section">
            <div className="section-title">전체 소요 시간</div>
            <div className="compare-overall">
              <div className={`compare-overall__item ${diff.overallDiff.fasterFile === 'A' ? 'compare-overall__item--winner' : ''}`}>
                <span className="compare-label compare-label--a">{labelA}</span>
                <span className="compare-duration">{formatDuration(diff.overallDiff.totalDurationA)}</span>
                {diff.overallDiff.fasterFile === 'A' && <span className="compare-badge compare-badge--faster">빠름 ✓</span>}
              </div>
              <div className={`compare-overall__item ${diff.overallDiff.fasterFile === 'B' ? 'compare-overall__item--winner' : ''}`}>
                <span className="compare-label compare-label--b">{labelB}</span>
                <span className="compare-duration">{formatDuration(diff.overallDiff.totalDurationB)}</span>
                {diff.overallDiff.fasterFile === 'B' && <span className="compare-badge compare-badge--faster">빠름 ✓</span>}
              </div>
              {diff.overallDiff.totalDurationA != null && diff.overallDiff.totalDurationB != null && (
                <div className="compare-overall__delta">
                  차이: {formatDuration(Math.abs(diff.overallDiff.totalDurationA - diff.overallDiff.totalDurationB))}
                </div>
              )}
            </div>
          </div>

          {/* Step comparison */}
          <div className="compare-section">
            <div className="section-title">단계별 비교</div>
            <div className="compare-legend">
              <span className="compare-legend-dot compare-legend-dot--a" /><span>{labelA}</span>
              <span className="compare-legend-dot compare-legend-dot--b" style={{ marginLeft: 16 }} /><span>{labelB}</span>
            </div>
            <div className="compare-steps">
              {diff.stepDiffs.map(step => (
                <div key={step.name} className="compare-step-row">
                  <div className="compare-step-name" style={{ borderLeft: `3px solid ${STEP_COLORS[step.name] || '#6b7280'}` }}>
                    {step.name}
                    <div className="compare-step-states">
                      {step.stateA && <span className={`step-state step-state--${step.stateA}`}>{step.stateA}</span>}
                      {step.stateB && <span className={`step-state step-state--${step.stateB}`}>{step.stateB}</span>}
                    </div>
                  </div>
                  <div className="compare-step-bars">
                    <DurationBar
                      durationA={step.durationA}
                      durationB={step.durationB}
                      maxMs={maxStepMs}
                      colorA="rgba(99,102,241,0.7)"
                      colorB="rgba(59,130,246,0.7)"
                    />
                  </div>
                  {step.deltaMs != null && (
                    <div className={`compare-delta ${step.fasterFile === 'A' ? 'compare-delta--a' : step.fasterFile === 'B' ? 'compare-delta--b' : ''}`}>
                      {step.fasterFile === 'A' ? '▲' : step.fasterFile === 'B' ? '▼' : '='} {formatDuration(Math.abs(step.deltaMs))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Imaging */}
          <div className="compare-section">
            <div className="section-title">이미징 비교</div>
            <div className="analysis-grid">
              <div className="analysis-card">
                <h4>{labelA}</h4>
                <div className="analysis-row"><span>총 Spot</span><span>{diff.imagingDiff.totalSpotsA ?? '--'}</span></div>
                <div className="analysis-row"><span>취득</span><span>{diff.imagingDiff.obtainedA ?? '--'}</span></div>
                <div className="analysis-row"><span>평균 간격</span><span>{diff.imagingDiff.avgMsA ? diff.imagingDiff.avgMsA + 'ms' : '--'}</span></div>
              </div>
              <div className="analysis-card">
                <h4>{labelB}</h4>
                <div className="analysis-row"><span>총 Spot</span><span>{diff.imagingDiff.totalSpotsB ?? '--'}</span></div>
                <div className="analysis-row"><span>취득</span><span>{diff.imagingDiff.obtainedB ?? '--'}</span></div>
                <div className="analysis-row"><span>평균 간격</span><span>{diff.imagingDiff.avgMsB ? diff.imagingDiff.avgMsB + 'ms' : '--'}</span></div>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="compare-section">
            <div className="section-title">에러 비교</div>
            <div className="analysis-grid">
              <div className="analysis-card">
                <h4>{labelA} — {diff.errorDiff.countA}개</h4>
                {diff.errorDiff.onlyInA.length > 0 ? (
                  <>
                    <div className="text-dim" style={{ fontSize: 11, marginBottom: 4 }}>B에 없는 에러:</div>
                    {diff.errorDiff.onlyInA.map((e, i) => <div key={i} className="error-item" style={{ fontSize: 11 }}>{e.substring(0, 120)}</div>)}
                  </>
                ) : <div className="text-dim">고유 에러 없음</div>}
              </div>
              <div className="analysis-card">
                <h4>{labelB} — {diff.errorDiff.countB}개</h4>
                {diff.errorDiff.onlyInB.length > 0 ? (
                  <>
                    <div className="text-dim" style={{ fontSize: 11, marginBottom: 4 }}>A에 없는 에러:</div>
                    {diff.errorDiff.onlyInB.map((e, i) => <div key={i} className="error-item" style={{ fontSize: 11 }}>{e.substring(0, 120)}</div>)}
                  </>
                ) : <div className="text-dim">고유 에러 없음</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
