import React, { useState } from 'react';
import { StickyNote, Trash2, Search } from 'lucide-react';
import { useErrorNotes } from '../hooks/useErrorNotes';

export default function NotesPage() {
  const { getAllNotes, removeNote } = useErrorNotes();
  const [filter, setFilter] = useState('');
  const allNotes = getAllNotes();

  const filtered = filter.trim()
    ? allNotes.filter(n =>
        n.message.toLowerCase().includes(filter.toLowerCase()) ||
        n.note.toLowerCase().includes(filter.toLowerCase())
      )
    : allNotes;

  return (
    <div className="notes-page">
      <div className="page-header">
        <h2><StickyNote size={20} /> Error Notes</h2>
      </div>

      <div className="monitor-page__toolbar">
        <div className="search-input-wrapper" style={{ flex: 1 }}>
          <Search size={14} />
          <input
            type="text"
            className="search-input"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="메모 또는 에러 메시지로 검색..."
          />
        </div>
        <span className="text-dim" style={{ fontSize: 12 }}>{filtered.length}개</span>
      </div>

      {filtered.length === 0 && (
        <div className="centered-message">
          <StickyNote size={32} style={{ color: 'var(--text-dim)' }} />
          <span>{allNotes.length === 0 ? '저장된 메모가 없습니다. 에러 옆의 📒 아이콘을 클릭해 메모를 추가하세요.' : '검색 결과가 없습니다.'}</span>
        </div>
      )}

      <div className="notes-list">
        {filtered.map(n => (
          <div key={n.noteKey} className="note-item">
            <div className="note-item__header">
              <StickyNote size={13} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
              <span className="note-item__ts">{n.timestamp ? n.timestamp.substring(0, 19) : '—'}</span>
              <span className="note-item__updated">수정: {new Date(n.updatedAt).toLocaleString()}</span>
              <button className="btn btn--ghost note-item__del" onClick={() => removeNote(n.noteKey)}>
                <Trash2 size={13} />
              </button>
            </div>
            <div className="note-item__error">{n.message.substring(0, 250)}</div>
            <div className="note-item__note">{n.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
