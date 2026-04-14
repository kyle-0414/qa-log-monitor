import { useState, useCallback } from 'react';

const STORAGE_KEY = 'qa-error-notes';

function makeNoteKey(message, timestamp) {
  const raw = (message || '').trim().substring(0, 100) + '|' + (timestamp || '').substring(0, 19);
  return btoa(encodeURIComponent(raw)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 40);
}

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function useErrorNotes() {
  const [notes, setNotes] = useState(loadNotes);

  const save = useCallback((updated) => {
    setNotes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const getNote = useCallback((message, timestamp) => {
    const key = makeNoteKey(message, timestamp);
    return notes[key] || null;
  }, [notes]);

  const setNote = useCallback((message, timestamp, noteText) => {
    const key = makeNoteKey(message, timestamp);
    const updated = { ...notes };
    if (!noteText.trim()) {
      delete updated[key];
    } else {
      updated[key] = {
        noteKey: key,
        message: (message || '').substring(0, 200),
        timestamp,
        note: noteText.trim(),
        createdAt: updated[key]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    save(updated);
  }, [notes, save]);

  const removeNote = useCallback((noteKey) => {
    const updated = { ...notes };
    delete updated[noteKey];
    save(updated);
  }, [notes, save]);

  const getAllNotes = useCallback(() => {
    return Object.values(notes).sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }, [notes]);

  return { getNote, setNote, removeNote, getAllNotes, makeNoteKey };
}

export { makeNoteKey };
