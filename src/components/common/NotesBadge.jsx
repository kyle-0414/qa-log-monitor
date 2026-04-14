import React, { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { useErrorNotes } from '../../hooks/useErrorNotes';
import ErrorNoteModal from './ErrorNoteModal';

export default function NotesBadge({ message, timestamp }) {
  const { getNote } = useErrorNotes();
  const [open, setOpen] = useState(false);
  const existing = getNote(message, timestamp);

  return (
    <>
      <button
        className={`note-badge ${existing ? 'note-badge--has' : ''}`}
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title={existing ? `메모: ${existing.note}` : '메모 추가'}
      >
        <StickyNote size={12} />
      </button>
      {open && (
        <ErrorNoteModal
          message={message}
          timestamp={timestamp}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
