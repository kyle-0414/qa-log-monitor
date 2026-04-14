import React, { useEffect } from 'react';
import { Play, Square, Trash2, Activity } from 'lucide-react';
import { useLogStream } from '../../hooks/useLogStream';
import { PROCESS_STEPS } from '../../constants/processSteps';

const STEP_LABELS = {
  waitCartridge: 'Wait Cartridge', insert: 'Insert', stain: 'Stain',
  findPressPosition: 'Find Press', setupImaging: 'Setup Imaging', imaging: 'Imaging', eject: 'Eject',
};

const STATUS_DOT = {
  connected: 'var(--green)',
  connecting: 'var(--yellow)',
  error: 'var(--red)',
  disconnected: 'var(--text-dim)',
};

export default function DeviceCard({ device, onRemove }) {
  const stream = useLogStream();
  const isConnected = stream.connectionStatus === 'connected';
  const isConnecting = stream.connectionStatus === 'connecting';

  const handleConnect = () => {
    stream.connect('latest', device);
  };

  const pct = stream.imagingTotal > 0
    ? Math.min(100, Math.round((stream.imagingObtained / stream.imagingTotal) * 100))
    : null;

  return (
    <div className={`device-card ${isConnected ? 'device-card--connected' : ''}`}>
      <div className="device-card__header">
        <div className="device-card__title">
          <span className="device-card__status-dot" style={{ background: STATUS_DOT[stream.connectionStatus] || STATUS_DOT.disconnected }} />
          <span className="device-card__label">{device.label || device.host}</span>
        </div>
        <button className="btn btn--ghost device-card__remove" onClick={() => { stream.disconnect(); onRemove(device.id); }} title="제거">
          <Trash2 size={12} />
        </button>
      </div>

      <div className="device-card__info">
        <span className="text-dim" style={{ fontSize: 11 }}>{device.host}:{device.port}</span>
        {stream.currentFile && <span className="text-dim" style={{ fontSize: 11 }}>{stream.currentFile}</span>}
      </div>

      {isConnected && (
        <>
          <div className="device-card__step">
            <Activity size={11} />
            <span>{stream.currentStep ? (STEP_LABELS[stream.currentStep] || stream.currentStep) : (stream.processId ? '대기 중' : '연결됨')}</span>
          </div>

          {pct != null && (
            <div className="device-card__progress">
              <div className="device-card__progress-bar" style={{ width: `${pct}%` }} />
              <span className="device-card__progress-label">{stream.imagingObtained}/{stream.imagingTotal} ({pct}%)</span>
            </div>
          )}

          {stream.errorCount > 0 && (
            <div className="device-card__errors">
              <span className="error-badge error-badge--has" style={{ fontSize: 10, padding: '1px 6px' }}>
                에러 {stream.errorCount}
              </span>
            </div>
          )}
        </>
      )}

      <div className="device-card__actions">
        {!isConnected ? (
          <button className="btn btn--primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={handleConnect} disabled={isConnecting}>
            <Play size={12} /> {isConnecting ? '연결 중...' : '연결'}
          </button>
        ) : (
          <button className="btn btn--danger" style={{ fontSize: 12, padding: '4px 12px' }} onClick={stream.disconnect}>
            <Square size={12} /> 연결 해제
          </button>
        )}
      </div>
    </div>
  );
}
