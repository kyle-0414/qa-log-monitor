import React, { useState, useRef } from 'react';
import { Bookmark, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function BookmarkPanel({ bookmarks, onAdd, onRemove, lastTimestamp }) {
  const [expanded, setExpanded] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [note, setNote] = useState('');
  const inputRef = useRef(null);

  const handleAdd = () => {
    onAdd(note.trim() || '(메모 없음)');
    setNote('');
    setInputVisible(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setInputVisible(false); setNote(''); }
  };

  const formatTs = (ts) => ts ? ts.substring(11, 19) : '—';

  return (
    <div className="bookmark-panel">
      <div className="bookmark-panel__header">
        <div className="bookmark-panel__title" onClick={() => setExpanded(!expanded)}>
          <Bookmark size={15} />
          <span>Bookmarks ({bookmarks.length})</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
        <button
          className="btn btn--ghost bookmark-panel__add-btn"
          onClick={() => { setInputVisible(v => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
          title="Add bookmark at current position"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {inputVisible && (
        <div className="bookmark-panel__input-row">
          <span className="bookmark-panel__ts">{formatTs(lastTimestamp)}</span>
          <input
            ref={inputRef}
            className="bookmark-panel__input"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메모 입력 후 Enter..."
            maxLength={120}
          />
          <button className="btn btn--primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={handleAdd}>저장</button>
          <button className="btn btn--ghost" style={{ padding: '4px 8px' }} onClick={() => { setInputVisible(false); setNote(''); }}>
            <X size={13} />
          </button>
        </div>
      )}

      {expanded && (
        <div className="bookmark-panel__list">
          {bookmarks.length === 0 ? (
            <div className="bookmark-panel__empty">북마크가 없습니다. Add 버튼으로 현재 시점을 기록하세요.</div>
          ) : (
            bookmarks.map(bm => (
              <div key={bm.id} className="bookmark-item">
                <Bookmark size={12} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                <span className="bookmark-item__ts">{formatTs(bm.timestamp)}</span>
                {bm.step && <span className="bookmark-item__step">{bm.step}</span>}
                <span className="bookmark-item__note">{bm.note}</span>
                <button className="btn btn--ghost bookmark-item__del" onClick={() => onRemove(bm.id)}>
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
