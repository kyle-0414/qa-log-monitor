import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, useMemo } from 'react';
import { PROCESS_STEPS } from '../constants/processSteps';

const MAX_RAW_LINES = 2000;

const initialState = {
  connectionStatus: 'disconnected',
  currentFile: null,
  deviceInfo: {},
  processId: null,
  processState: null,
  steps: {},
  currentStep: null,
  imagingObtained: 0,
  imagingTotal: 0,
  imagingStartTime: null,
  imagingAvgMs: null,
  errorCount: 0,
  warningCount: 0,
  errors: [],
  rawLines: [],
  mcuStatus: null,
  initialLoadDone: false,
  lastLogTimestamp: null,
  bookmarks: [],
};

function extractTimestamp(data) {
  // Check common timestamp fields from parsed events
  if (data.timestamp) return data.timestamp;
  if (data.line) {
    const match = data.line.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+\d+)/);
    if (match) return match[1];
  }
  return null;
}

function reducer(state, action) {
  // Track lastLogTimestamp from any event that carries a timestamp
  let lastLogTimestamp = state.lastLogTimestamp;
  if (action.data) {
    const ts = extractTimestamp(action.data);
    if (ts) lastLogTimestamp = ts;
  }

  switch (action.type) {
    case 'CONNECTION':
      return { ...state, lastLogTimestamp, connectionStatus: action.data.status, currentFile: action.data.file || state.currentFile };

    case 'RESET':
      return { ...initialState };

    case 'DEVICE_INFO':
      return { ...state, lastLogTimestamp, deviceInfo: { ...state.deviceInfo, [action.data.field]: action.data.value } };

    case 'PROCESS_START':
      return {
        ...state,
        lastLogTimestamp,
        processId: action.data.processId,
        processState: 'inProgress',
        steps: {},
        currentStep: null,
        imagingObtained: 0,
        imagingTotal: 0,
        errorCount: 0,
        errors: [],
      };

    case 'PROCESS_END':
      return { ...state, lastLogTimestamp, processState: action.data.state };

    case 'STEP_START': {
      if (!action.data.isMainStep) return { ...state, lastLogTimestamp };
      const newSteps = { ...state.steps, [action.data.step]: { state: 'inProgress', startTime: action.data.timestamp } };
      return { ...state, lastLogTimestamp, steps: newSteps, currentStep: action.data.step };
    }

    case 'STEP_DONE': {
      if (!action.data.isMainStep) return { ...state, lastLogTimestamp };
      const existing = state.steps[action.data.step] || {};
      const newSteps = { ...state.steps, [action.data.step]: { ...existing, state: action.data.result, endTime: action.data.timestamp } };
      return { ...state, lastLogTimestamp, steps: newSteps };
    }

    case 'IMAGING_PROGRESS': {
      const obtained = action.data.index + 1;
      const now = action.data.timestamp;
      return {
        ...state,
        lastLogTimestamp,
        imagingObtained: Math.max(state.imagingObtained, obtained),
        imagingStartTime: state.imagingStartTime || now,
      };
    }

    case 'IMAGING_META':
      return {
        ...state,
        lastLogTimestamp,
        imagingTotal: action.data.totalSpotCount || state.imagingTotal,
        processId: action.data.processId || state.processId,
      };

    case 'IMAGING_PHASE':
      if (action.data.event === 'end') {
        return { ...state, lastLogTimestamp, imagingAvgMs: action.data.avgMs, imagingObtained: action.data.count };
      }
      return { ...state, lastLogTimestamp };

    case 'MCU_STATUS':
      return { ...state, lastLogTimestamp, mcuStatus: action.data };

    case 'ERROR':
      return {
        ...state,
        lastLogTimestamp,
        errorCount: state.errorCount + 1,
        errors: [...state.errors.slice(-99), { message: action.data.message, timestamp: action.data.timestamp }],
      };

    case 'RAW_LINE': {
      const lines = [...state.rawLines, action.data.line];
      if (lines.length > MAX_RAW_LINES) lines.splice(0, lines.length - MAX_RAW_LINES);
      return { ...state, lastLogTimestamp, rawLines: lines };
    }

    case 'INITIAL_LOAD_DONE':
      return { ...state, lastLogTimestamp, initialLoadDone: true };

    case 'ADD_BOOKMARK': {
      const bookmark = {
        id: Date.now(),
        timestamp: action.data.timestamp || state.lastLogTimestamp,
        note: action.data.note,
        step: state.currentStep,
      };
      return { ...state, bookmarks: [...state.bookmarks, bookmark] };
    }

    case 'REMOVE_BOOKMARK':
      return { ...state, bookmarks: state.bookmarks.filter(b => b.id !== action.data.id) };

    default:
      return { ...state, lastLogTimestamp };
  }
}

const EVENT_TYPE_MAP = {
  'device-info': 'DEVICE_INFO',
  'process-start': 'PROCESS_START',
  'process-end': 'PROCESS_END',
  'step-start': 'STEP_START',
  'step-done': 'STEP_DONE',
  'imaging-progress': 'IMAGING_PROGRESS',
  'imaging-meta': 'IMAGING_META',
  'imaging-phase': 'IMAGING_PHASE',
  'mcu-status': 'MCU_STATUS',
  'error': 'ERROR',
  'raw': 'RAW_LINE',
  'connection': 'CONNECTION',
  'initial-load-done': 'INITIAL_LOAD_DONE',
};

const LogStreamContext = createContext(null);

export function LogStreamProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const eventSourceRef = useRef(null);

  const connect = useCallback((filename) => {
    // Disconnect existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    dispatch({ type: 'RESET' });
    dispatch({ type: 'CONNECTION', data: { status: 'connecting' } });

    const params = filename ? `?file=${encodeURIComponent(filename)}` : '?file=latest';
    const es = new EventSource(`/api/stream${params}`);
    eventSourceRef.current = es;

    // Register all SSE event listeners
    Object.entries(EVENT_TYPE_MAP).forEach(([sseEvent, actionType]) => {
      es.addEventListener(sseEvent, (e) => {
        try {
          const data = JSON.parse(e.data);
          dispatch({ type: actionType, data });
        } catch (err) {
          console.error('Parse error:', err);
        }
      });
    });

    es.onerror = () => {
      dispatch({ type: 'CONNECTION', data: { status: 'error' } });
    };
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    dispatch({ type: 'CONNECTION', data: { status: 'disconnected' } });
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const addBookmark = useCallback((note) => {
    dispatch({ type: 'ADD_BOOKMARK', data: { note } });
  }, []);

  const removeBookmark = useCallback((id) => {
    dispatch({ type: 'REMOVE_BOOKMARK', data: { id } });
  }, []);

  const value = useMemo(() => ({
    ...state,
    connect,
    disconnect,
    addBookmark,
    removeBookmark,
  }), [state, connect, disconnect, addBookmark, removeBookmark]);

  return (
    <LogStreamContext.Provider value={value}>
      {children}
    </LogStreamContext.Provider>
  );
}

export function useLogStreamContext() {
  const ctx = useContext(LogStreamContext);
  if (!ctx) {
    throw new Error('useLogStreamContext must be used within a LogStreamProvider');
  }
  return ctx;
}
