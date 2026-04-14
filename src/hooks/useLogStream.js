import { useReducer, useCallback, useRef, useEffect } from 'react';
import { PROCESS_STEPS } from '../constants/processSteps';

const MAX_RAW_LINES = 300;

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
};

function reducer(state, action) {
  switch (action.type) {
    case 'CONNECTION':
      return { ...state, connectionStatus: action.data.status, currentFile: action.data.file || state.currentFile };

    case 'RESET':
      return { ...initialState };

    case 'DEVICE_INFO':
      return { ...state, deviceInfo: { ...state.deviceInfo, [action.data.field]: action.data.value } };

    case 'PROCESS_START':
      return {
        ...state,
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
      return { ...state, processState: action.data.state };

    case 'STEP_START': {
      if (!action.data.isMainStep) return state;
      const newSteps = { ...state.steps, [action.data.step]: { state: 'inProgress', startTime: action.data.timestamp } };
      return { ...state, steps: newSteps, currentStep: action.data.step };
    }

    case 'STEP_DONE': {
      if (!action.data.isMainStep) return state;
      const existing = state.steps[action.data.step] || {};
      const newSteps = { ...state.steps, [action.data.step]: { ...existing, state: action.data.result, endTime: action.data.timestamp } };
      return { ...state, steps: newSteps };
    }

    case 'IMAGING_PROGRESS': {
      const obtained = action.data.index + 1;
      const now = action.data.timestamp;
      return {
        ...state,
        imagingObtained: Math.max(state.imagingObtained, obtained),
        imagingStartTime: state.imagingStartTime || now,
      };
    }

    case 'IMAGING_META':
      return {
        ...state,
        imagingTotal: action.data.totalSpotCount || state.imagingTotal,
        processId: action.data.processId || state.processId,
      };

    case 'IMAGING_PHASE':
      if (action.data.event === 'end') {
        return { ...state, imagingAvgMs: action.data.avgMs, imagingObtained: action.data.count };
      }
      return state;

    case 'MCU_STATUS':
      return { ...state, mcuStatus: action.data };

    case 'ERROR':
      return {
        ...state,
        errorCount: state.errorCount + 1,
        errors: [...state.errors.slice(-99), { message: action.data.message, timestamp: action.data.timestamp }],
      };

    case 'RAW_LINE': {
      const lines = [...state.rawLines, action.data.line];
      if (lines.length > MAX_RAW_LINES) lines.splice(0, lines.length - MAX_RAW_LINES);
      return { ...state, rawLines: lines };
    }

    case 'INITIAL_LOAD_DONE':
      return { ...state, initialLoadDone: true };

    default:
      return state;
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

export function useLogStream() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const eventSourceRef = useRef(null);

  const connect = useCallback((filename, deviceConfig) => {
    disconnect();
    dispatch({ type: 'RESET' });
    dispatch({ type: 'CONNECTION', data: { status: 'connecting' } });

    let params = filename ? `?file=${encodeURIComponent(filename)}` : '?file=latest';
    if (deviceConfig) {
      params += `&host=${encodeURIComponent(deviceConfig.host)}&port=${encodeURIComponent(deviceConfig.port)}&user=${encodeURIComponent(deviceConfig.username)}&pass=${encodeURIComponent(deviceConfig.password)}`;
    }
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

  return { ...state, connect, disconnect };
}
