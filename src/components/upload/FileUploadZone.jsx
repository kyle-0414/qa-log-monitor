import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { parseFullLog } from '../../lib/logParser';

export default function FileUploadZone({ onParsed }) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.log')) {
      setError('.log 파일만 지원합니다');
      return;
    }
    setError(null);
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const result = parseFullLog(content);
        onParsed(result, file.name);
      } catch (err) {
        setError('파싱 중 오류가 발생했습니다: ' + err.message);
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => { setError('파일 읽기 실패'); setParsing(false); };
    reader.readAsText(file);
  }, [onParsed]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);
  const handleChange = useCallback((e) => processFile(e.target.files[0]), [processFile]);

  return (
    <div
      className={`upload-zone ${dragging ? 'upload-zone--dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !parsing && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".log"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      {parsing ? (
        <>
          <Loader2 size={28} className="spinning" style={{ color: 'var(--accent)' }} />
          <span>파싱 중...</span>
        </>
      ) : (
        <>
          <Upload size={28} style={{ color: 'var(--text-dim)' }} />
          <span>로컬 .log 파일을 드래그하거나 클릭해서 업로드</span>
          {error && <span className="text-red" style={{ fontSize: 12 }}>{error}</span>}
        </>
      )}
    </div>
  );
}
