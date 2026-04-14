import React, { useState, useEffect, useRef } from 'react';
import { X, StickyNote, Trash2 } from 'lucide-react';
import { useErrorNotes } from '../../hooks/useErrorNotes';

export default function ErrorNoteModal({ message, timestamp, onClose }) {
  const { getNote, setNote } = useErrorNotes();
  const existing = getNote(message, timestamp);
  const [text, setText] = useState(existing?.note || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleSave = () => {
    setNote(message, timestamp, text);
    onClose();
  };

  const handleDelete = () => {
    setNote(message, timestamp, '');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-box__header">
          <div className="modal-box__title">
            <StickyNote size={15} />
            Error Note
          </div>
          <button className="btn btn--ghost" onClick={onClose} style={{ padding: '2px 6px' }}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-box__body">
          <div className="note-modal__error-preview">
            {timestamp && <span className="note-modal__ts">{timestamp.substring(11, 19)}</span>}
            <span className="note-modal__msg">{(message || '').substring(0, 150)}</span>
          </div>
          <textarea
            ref={textareaRef}
            className="note-modal__textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="에러에 대한 메모를 입력하세요..."
            rows={4}
            maxLength={500}
          />
        </div>

        <div className="modal-box__footer">
          {existing && (
            <button className="btn btn--danger" onClick={handleDelete} style={{ marginRight: 'auto' }}>
              <Trash2 size={13} /> 삭제
            </button>
          )}
          <button className="btn btn--ghost" onClick={onClose}>취소</button>
          <button className="btn btn--primary" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  );
}
