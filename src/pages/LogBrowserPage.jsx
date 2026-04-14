import React, { useEffect, useState } from 'react';
import { FolderOpen, FileText, RefreshCw, Loader2, Upload } from 'lucide-react';
import NotesBadge from '../components/common/NotesBadge';
import FileUploadZone from '../components/upload/FileUploadZone';

export default function LogBrowserPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const fetchFiles = () => {
    setLoading(true);
    fetch('/api/logs').then(r => r.json()).then(setFiles).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchFiles(); }, []);

  const analyzeFile = (filename) => {
    setSelected(filename);
    setAnalyzing(true);
    fetch(`/api/logs/${filename}`)
      .then(r => r.json()).then(setAnalysis).catch(() => setAnalysis(null)).finally(() => setAnalyzing(false));
  };

  const handleUploaded = (result, filename) => {
    setSelected(filename);
    setAnalysis(result);
    setShowUpload(false);
  };

  return (
    <div className="log-browser">
      <div className="page-header">
        <h2><FolderOpen size={20} /> Log File Browser</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--ghost" onClick={() => setShowUpload(v => !v)}>
            <Upload size={14} /> {showUpload ? '업로드 닫기' : '로컬 파일 업로드'}
          </button>
          <button className="btn btn--ghost" onClick={fetchFiles}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
          </button>
        </div>
      </div>

      {showUpload && (
        <div style={{ padding: '0 0 16px' }}>
          <FileUploadZone onParsed={handleUploaded} />
        </div>
      )}

      <div className="log-browser__layout">
        <div className="log-browser__list">
          {files.map(f => (
            <div
              key={f.filename}
              className={`log-file-item ${selected === f.filename ? 'log-file-item--selected' : ''}`}
              onClick={() => !f.isCompressed && analyzeFile(f.filename)}
            >
              <FileText size={16} />
              <div className="log-file-item__info">
                <span className="log-file-item__name">{f.filename}</span>
                <span className="log-file-item__meta">{(f.size / 1024 / 1024).toFixed(2)} MB · {f.date}</span>
              </div>
              {f.isCompressed && <span className="badge badge--dim">gz</span>}
            </div>
          ))}
        </div>

        <div className="log-browser__detail">
          {analyzing && <div className="centered-message"><Loader2 size={24} className="spinning" /><span>Analyzing log file...</span></div>}
          {analysis && !analyzing && (
            <div className="log-analysis">
              <h3>Analysis: {selected}</h3>
              <div className="analysis-grid">
                <div className="analysis-card">
                  <h4>Device Info</h4>
                  {Object.entries(analysis.deviceInfo).map(([k, v]) => (
                    <div key={k} className="analysis-row"><span>{k}</span><span>{v}</span></div>
                  ))}
                </div>
                <div className="analysis-card">
                  <h4>Process</h4>
                  {analysis.process && (
                    <>
                      <div className="analysis-row"><span>ID</span><span>{analysis.process.id}</span></div>
                      <div className="analysis-row"><span>State</span><span className={analysis.process.state === 'success' ? 'text-green' : 'text-red'}>{analysis.process.state}</span></div>
                    </>
                  )}
                </div>
                <div className="analysis-card">
                  <h4>Imaging</h4>
                  <div className="analysis-row"><span>Total Spots</span><span>{analysis.imaging.totalSpots}</span></div>
                  <div className="analysis-row"><span>Obtained</span><span>{analysis.imaging.obtainedSpots}</span></div>
                </div>
                <div className="analysis-card">
                  <h4>Steps</h4>
                  {analysis.steps.map(s => (
                    <div key={s.name} className="analysis-row">
                      <span>{s.name}</span>
                      <span className={s.state === 'success' ? 'text-green' : s.state === 'fail' ? 'text-red' : ''}>{s.state}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="analysis-card" style={{ marginTop: '1rem' }}>
                <h4>Errors ({analysis.errors.length})</h4>
                {analysis.errors.slice(0, 20).map((e, i) => (
                  <div key={i} className="error-item">
                    <span className="error-item__time">{e.timestamp?.substring(11,19)}</span>
                    <span className="error-item__msg">{e.message?.substring(0, 200)}</span>
                    <NotesBadge message={e.message} timestamp={e.timestamp} />
                  </div>
                ))}
                {analysis.errors.length === 0 && <div className="text-dim">No errors found</div>}
              </div>
            </div>
          )}
          {!analysis && !analyzing && (
            <div className="centered-message text-dim">Select a log file to analyze</div>
          )}
        </div>
      </div>
    </div>
  );
}
