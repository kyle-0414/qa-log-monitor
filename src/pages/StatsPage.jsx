import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BarChart3, RefreshCw, Loader2, Filter, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import SvgBarChart from '../components/charts/SvgBarChart';
import { parseTimestampToMs, formatDuration } from '../lib/compareUtils';

// ── 상수 ────────────────────────────────────────────────────────────────────────
const STEP_COLORS = {
  waitCartridge: '#6366f1', insert: '#3b82f6', stain: '#f59e0b',
  findPressPosition: '#8b5cf6', setupImaging: '#06b6d4', imaging: '#10b981', eject: '#ec4899',
};
const STEP_LABELS = {
  waitCartridge: 'Wait', insert: 'Insert', stain: 'Stain',
  findPressPosition: 'FindPress', setupImaging: 'Setup', imaging: 'Imaging', eject: 'Eject',
};
const FULL_STEPS = ['insert', 'stain', 'findPressPosition'];

// ── 유틸 함수 ───────────────────────────────────────────────────────────────────
function stepDuration(step) {
  const s = parseTimestampToMs(step.startTime);
  const e = parseTimestampToMs(step.endTime);
  return s && e ? e - s : null;
}

function getSlideIdType(id) {
  if (!id) return 'unknown';
  if (/^X/i.test(id)) return 'x-type';
  if (/^\d+_[A-Za-z0-9]+$/.test(id)) return 'suffix';
  if (/^\d+$/.test(id)) return 'normal';
  return 'unknown';
}

function getTestMethod(proc) {
  const names = (proc.steps || []).map(s => s.name);
  return FULL_STEPS.some(s => names.includes(s)) ? 'full' : 'imaging-only';
}

function isTestSuccess(proc) {
  if (proc.state === 'success') return true;
  const eject = (proc.steps || []).find(s => s.name === 'eject');
  return !!(eject && eject.state === 'success');
}

function getFailureReason(proc) {
  if (isTestSuccess(proc)) return '';
  if (proc.state === 'abort' || proc.state === 'aborted') return 'Abort';
  const failedStep = (proc.steps || []).find(s => s.state === 'fail' || s.state === 'error');
  if (failedStep) return `${failedStep.name} 실패`;
  if (proc.errors?.length > 0) return proc.errors[0].message.substring(0, 80);
  if (proc.state && proc.state !== 'inProgress') return `state: ${proc.state}`;
  return '미완료';
}

function formatDate(ts) {
  if (!ts) return '—';
  const m = ts.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (!m) return ts.substring(0, 10);
  return `${m[1].substring(2)}/${m[2]}/${m[3]} ${m[4]}:${m[5]}`;
}

function toDateStr(ts) {
  if (!ts) return '';
  const m = ts.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

function formatMs(ms) {
  if (ms == null) return '—';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * SSW 프로세스 종료 시각(ms) 기준으로 App 로그 슬라이드 ID 매칭
 * App "finished" 이벤트는 SSW 종료보다 약간 늦게 찍히는 특성 고려
 */
/**
 * 전략 1 (우선): ID 직접 매칭
 *   - 정확 일치: SSW "X10870_260403_003" == App "X10870_260403_003"
 *   - 접두사 일치: SSW "X10870_260403_002" → App "X10870_260403_002_PR6Q" (재시도 suffix)
 * 전략 2 (fallback): endMs 기준 ±60분 타임스탬프 매칭
 */
function matchSlideId(procId, endMs, appEntries) {
  if (!appEntries?.length) return null;

  // 전략 1: ID 기반
  if (procId) {
    const exact = appEntries.find(e => e.slideId === procId);
    if (exact) return exact.slideId;
    const prefix = appEntries.find(e => e.slideId.startsWith(procId + '_'));
    if (prefix) return prefix.slideId;
  }

  // 전략 2: 타임스탬프 fallback (±60분)
  if (endMs) {
    const WINDOW = 60 * 60 * 1000;
    let best = null, bestDiff = Infinity;
    for (const entry of appEntries) {
      const diff = entry.timestampMs - endMs;
      if (diff >= -60_000 && diff <= WINDOW) {
        const absDiff = Math.abs(diff);
        if (absDiff < bestDiff) { bestDiff = absDiff; best = entry.slideId; }
      }
    }
    return best;
  }

  return null;
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────────
export default function StatsPage() {
  const [fileList, setFileList] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [showCharts, setShowCharts] = useState(false);
  const [processMap, setProcessMap] = useState({});   // X넘버 → { fullSlideId, ... }
  const [mapLoading, setMapLoading] = useState(false);
  const cacheRef = useRef({});

  // 필터 상태
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [filterMethod, setFilterMethod]   = useState('all');
  const [filterResult, setFilterResult]   = useState('all');
  const [filterIdType, setFilterIdType]   = useState('all');

  // process-map 로드 (서버에서 CER 매칭까지 완료된 데이터)
  const fetchProcessMap = async () => {
    setMapLoading(true);
    try {
      const data = await fetch('/api/process-map').then(r => r.json());
      setProcessMap(data && typeof data === 'object' ? data : {});
    } catch {
      setProcessMap({});
    } finally {
      setMapLoading(false);
    }
  };

  const fetchAllData = async (files) => {
    setLoading(true);
    setProgress({ done: 0, total: files.length });
    const results = [];
    const BATCH = 3;
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(batch.map(async f => {
        if (cacheRef.current[f.filename]) return { filename: f.filename, ...cacheRef.current[f.filename] };
        const data = await fetch(`/api/logs/${f.filename}`).then(r => r.json());
        cacheRef.current[f.filename] = data;
        return { filename: f.filename, ...data };
      }));
      batchResults.forEach(r => { if (r.status === 'fulfilled') results.push(r.value); });
      setProgress(p => ({ ...p, done: Math.min(i + BATCH, files.length) }));
    }
    setAllData(results);
    setLoading(false);
  };

  useEffect(() => {
    // SSW 로그 + process-map 병렬 로드
    fetch('/api/logs')
      .then(r => r.json())
      .then(files => {
        setFileList(files);
        fetchAllData(files);
      })
      .catch(() => {});
    fetchProcessMap();
  }, []);

  // ── 전체 행 생성 (process-map 매칭 포함) ─────────────────────────────────────
  const allRows = useMemo(() => {
    const rows = [];
    for (const d of allData) {
      const deviceId = d.deviceInfo?.deviceId || d.deviceInfo?.serialNumber || '—';
      for (const proc of (d.processes || [])) {
        if (!proc.startTime) continue;
        const xId      = proc.id || '—';   // SSW 내부 X넘버
        const endMs    = parseTimestampToMs(proc.endTime) || 0;
        const startMs  = parseTimestampToMs(proc.startTime) || 0;

        // process-map 에서 바로 풀 슬라이드 ID 가져오기
        // (서버에서 process.json + CER 디렉토리 매칭 완료)
        const mapEntry    = processMap[xId];
        const realSlideId = mapEntry?.fullSlideId || null;

        // 표시할 슬라이드 ID: 실제 바코드(+suffix) 우선, 없으면 X넘버
        const displayId = realSlideId || xId;
        const slideType = getSlideIdType(displayId);

        const method    = getTestMethod(proc);
        const isSuccess = isTestSuccess(proc);
        const dateStr   = toDateStr(proc.startTime);

        const stepDurs = {};
        for (const step of (proc.steps || [])) {
          const dur = stepDuration(step);
          if (dur != null) stepDurs[step.name] = dur;
        }

        rows.push({
          deviceId,
          xId,            // SSW X넘버 (원본)
          realSlideId,    // App 로그 매칭 바코드 (null 이면 미매칭)
          displayId,      // 화면 표시용 (실제 바코드 or X넘버)
          slideType,
          method,
          dateStr, startMs, endMs,
          displayDate: formatDate(proc.startTime),
          state: proc.state,
          isSuccess,
          imaging: proc.imaging,
          stepDurs,
          failureReason: isSuccess ? '' : getFailureReason(proc),
          errorCount: proc.errors?.length || 0,
        });
      }
    }
    return rows.sort((a, b) => b.startMs - a.startMs);
  }, [allData, processMap]);

  // ── 필터 적용 ─────────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      if (dateFrom && row.dateStr < dateFrom) return false;
      if (dateTo   && row.dateStr > dateTo)   return false;
      if (filterMethod !== 'all' && row.method !== filterMethod) return false;
      if (filterResult === 'success' && !row.isSuccess) return false;
      if (filterResult === 'fail'    &&  row.isSuccess) return false;
      if (filterIdType !== 'all' && row.slideType !== filterIdType) return false;
      return true;
    });
  }, [allRows, dateFrom, dateTo, filterMethod, filterResult, filterIdType]);

  // ── 요약 통계 ─────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total   = filteredRows.length;
    const success = filteredRows.filter(r => r.isSuccess).length;
    const full    = filteredRows.filter(r => r.method === 'full').length;
    const imgOnly = filteredRows.filter(r => r.method === 'imaging-only').length;
    const matched = filteredRows.filter(r => r.realSlideId).length;
    return { total, success, fail: total - success, full, imgOnly, matched };
  }, [filteredRows]);

  // ── 차트용 평균 단계 시간 ─────────────────────────────────────────────────────
  const avgStepDurations = useMemo(() => {
    const sums = {}, counts = {};
    for (const row of filteredRows.filter(r => r.isSuccess)) {
      for (const [name, dur] of Object.entries(row.stepDurs)) {
        sums[name] = (sums[name] || 0) + dur;
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return Object.keys(STEP_COLORS)
      .filter(name => counts[name])
      .map(name => ({
        label: STEP_LABELS[name] || name,
        value: Math.round(sums[name] / counts[name]),
        valueLabel: formatDuration(Math.round(sums[name] / counts[name])),
        color: STEP_COLORS[name],
      }));
  }, [filteredRows]);

  const showFullCols = filterMethod !== 'imaging-only';

  return (
    <div className="stats-page">
      <div className="page-header">
        <h2><BarChart3 size={20} /> Statistics</h2>
        <button className="btn btn--ghost" onClick={() => {
          cacheRef.current = {};
          fetchAllData(fileList);
          fetchProcessMap();
        }}>
          <RefreshCw size={14} className={(loading || mapLoading) ? 'spinning' : ''} /> Refresh
        </button>
      </div>

      {/* process-map 매칭 상태 표시 */}
      {!mapLoading && Object.keys(processMap).length > 0 && (
        <div className="applog-status">
          <Link2 size={12} />
          슬라이드 ID 매핑: <strong>{Object.keys(processMap).length}건</strong> 로드됨
          {summary.matched > 0
            ? <span className="applog-status__matched"> · {summary.matched}건 실제 바코드로 표시</span>
            : <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>· 현재 필터에 매칭 항목 없음</span>
          }
        </div>
      )}
      {!mapLoading && Object.keys(processMap).length === 0 && !loading && (
        <div className="applog-status applog-status--warn">
          <Link2 size={12} />
          슬라이드 ID 매핑 미로드 — X넘버로 표시
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="stats-progress">
          <Loader2 size={16} className="spinning" />
          <span>로그 파일 분석 중... ({progress.done}/{progress.total})</span>
          <div className="stats-progress__bar">
            <div className="stats-progress__fill" style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '0%' }} />
          </div>
        </div>
      )}

      {/* ── 필터 바 ── */}
      <div className="stats-filter-bar">
        <Filter size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />

        <div className="stats-filter-group">
          <label className="stats-filter-label">날짜</label>
          <input type="date" className="stats-date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-dim">~</span>
          <input type="date" className="stats-date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>

        <div className="stats-filter-group">
          <label className="stats-filter-label">방법</label>
          <div className="stats-btn-group">
            {[['full','Full'],['imaging-only','Imaging only'],['all','전체']].map(([v,l]) => (
              <button key={v} className={`stats-filter-btn ${filterMethod===v?'stats-filter-btn--on':''}`} onClick={() => setFilterMethod(v)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="stats-filter-group">
          <label className="stats-filter-label">결과</label>
          <div className="stats-btn-group">
            {[['all','전체'],['success','성공'],['fail','실패']].map(([v,l]) => (
              <button key={v} className={`stats-filter-btn ${filterResult===v?'stats-filter-btn--on':''}`} onClick={() => setFilterResult(v)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="stats-filter-group">
          <label className="stats-filter-label">슬라이드 타입</label>
          <div className="stats-btn-group">
            {[['all','전체'],['normal','일반'],['suffix','일반+suffix'],['x-type','X타입']].map(([v,l]) => (
              <button key={v} className={`stats-filter-btn ${filterIdType===v?'stats-filter-btn--on':''}`} onClick={() => setFilterIdType(v)}>{l}</button>
            ))}
          </div>
        </div>

        {(dateFrom || dateTo || filterMethod!=='all' || filterResult!=='all' || filterIdType!=='all') && (
          <button className="btn btn--ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => {
            setDateFrom(''); setDateTo(''); setFilterMethod('all'); setFilterResult('all'); setFilterIdType('all');
          }}>초기화</button>
        )}
      </div>

      {/* ── 요약 카드 ── */}
      {!loading && allRows.length > 0 && (
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-card__value">{summary.total}</div>
            <div className="stat-card__label">총 테스트</div>
          </div>
          <div className="stat-card stat-card--green">
            <div className="stat-card__value">{summary.total > 0 ? Math.round((summary.success/summary.total)*100) : 0}%</div>
            <div className="stat-card__label">성공률 ({summary.success}건)</div>
          </div>
          <div className="stat-card stat-card--red">
            <div className="stat-card__value">{summary.fail}</div>
            <div className="stat-card__label">실패</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{summary.full}</div>
            <div className="stat-card__label">Full process</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{summary.imgOnly}</div>
            <div className="stat-card__label">Imaging only</div>
          </div>
        </div>
      )}

      {/* ── 테스트 목록 테이블 ── */}
      {!loading && filteredRows.length > 0 && (
        <div className="stats-section">
          <div className="section-title">테스트 목록 ({filteredRows.length}건)</div>
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>디바이스 ID</th>
                  <th>슬라이드 ID</th>
                  <th>날짜</th>
                  <th>방법</th>
                  <th>결과</th>
                  <th>이미징 취득</th>
                  {showFullCols && <th>Stain</th>}
                  <th>Imaging</th>
                  <th>실패 사유</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i} className={`stats-row ${row.isSuccess ? '' : 'stats-row--fail'}`}>
                    <td className="stats-td--device">{row.deviceId}</td>
                    <td className="stats-td--slide">
                      <span className={`slide-type-badge slide-type-badge--${row.slideType}`}>
                        {row.slideType === 'x-type' ? 'X' : row.slideType === 'suffix' ? '+suffix' : '일반'}
                      </span>
                      <span className="stats-td--slide-id" title={`표시: ${row.displayId}\nX넘버: ${row.xId}`}>
                        {row.displayId}
                      </span>
                      {/* App 로그 미매칭 시 X넘버 그대로 → 특별 표시 없음 */}
                      {/* App 로그 매칭 성공 시 X넘버와 다르면 링크 아이콘 */}
                      {row.realSlideId && row.realSlideId !== row.xId && (
                        <span className="slide-linked-icon" title={`X넘버: ${row.xId}`}>
                          <Link2 size={10} />
                        </span>
                      )}
                    </td>
                    <td className="stats-td--date">{row.displayDate}</td>
                    <td>
                      <span className={`method-badge method-badge--${row.method}`}>
                        {row.method === 'full' ? 'Full' : 'Img only'}
                      </span>
                    </td>
                    <td>
                      <span className={`result-badge result-badge--${row.isSuccess ? 'success' : 'fail'}`}>
                        {row.isSuccess ? '✅ 성공' : '❌ 실패'}
                      </span>
                    </td>
                    <td className="stats-td--imaging">
                      {row.imaging?.obtainedSpots != null
                        ? `${row.imaging.obtainedSpots}${row.imaging.totalSpots ? `/${row.imaging.totalSpots}` : ''}`
                        : '—'}
                    </td>
                    {showFullCols && (
                      <td>{row.stepDurs.stain != null ? formatMs(row.stepDurs.stain) : '—'}</td>
                    )}
                    <td>{row.stepDurs.imaging != null ? formatMs(row.stepDurs.imaging) : '—'}</td>
                    <td className="stats-td--reason">
                      {row.failureReason
                        ? <span className="failure-reason" title={row.failureReason}>{row.failureReason.substring(0, 60)}</span>
                        : <span className="text-dim">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredRows.length === 0 && allRows.length > 0 && (
        <div className="centered-message">
          <span className="text-dim">필터 조건에 맞는 테스트가 없어요</span>
        </div>
      )}

      {/* ── 차트 섹션 (토글) ── */}
      {!loading && filteredRows.length > 0 && (
        <div className="stats-section">
          <button className="stats-chart-toggle" onClick={() => setShowCharts(v => !v)}>
            <BarChart3 size={13} />
            단계별 평균 소요 시간 (성공 기준)
            {showCharts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showCharts && avgStepDurations.length > 0 && (
            <div className="stats-chart-box" style={{ marginTop: 8 }}>
              <SvgBarChart
                bars={avgStepDurations}
                labelWidth={90}
                height={avgStepDurations.length * 28 + 8}
              />
            </div>
          )}
        </div>
      )}

      {!loading && allRows.length === 0 && (
        <div className="centered-message">
          <BarChart3 size={32} style={{ color: 'var(--text-dim)' }} />
          <span>로그 파일이 없습니다</span>
        </div>
      )}
    </div>
  );
}
