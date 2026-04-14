import React, { useState } from 'react';
import { Bell, BellOff, Volume2, VolumeX, X } from 'lucide-react';
import { loadAlertSettings, saveAlertSettings } from '../../hooks/useAlerts';

export default function AlertSettingsPanel({ onClose, onSettingsChange, testBeep, requestPermission }) {
  const [settings, setSettings] = useState(loadAlertSettings);
  const notifyPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';

  const update = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveAlertSettings(next);
    onSettingsChange?.(next);
  };

  const handleNotifyToggle = async () => {
    if (!settings.notifyEnabled) {
      if (notifyPermission === 'default') await requestPermission();
    }
    update('notifyEnabled', !settings.notifyEnabled);
  };

  return (
    <div className="alert-panel">
      <div className="alert-panel__header">
        <span><Bell size={13} /> 알림 설정</span>
        <button className="btn btn--ghost" onClick={onClose} style={{ padding: '2px 6px' }}><X size={13} /></button>
      </div>

      <div className="alert-panel__row">
        <label className="alert-panel__label">
          {settings.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          소리 알림
        </label>
        <div className="toggle-group">
          <button className={`toggle-btn ${settings.soundEnabled ? 'toggle-btn--on' : ''}`} onClick={() => update('soundEnabled', !settings.soundEnabled)}>
            {settings.soundEnabled ? 'ON' : 'OFF'}
          </button>
          {settings.soundEnabled && (
            <button className="btn btn--ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={testBeep}>테스트</button>
          )}
        </div>
      </div>

      <div className="alert-panel__row">
        <label className="alert-panel__label">
          {settings.notifyEnabled ? <Bell size={13} /> : <BellOff size={13} />}
          브라우저 알림
          {notifyPermission === 'denied' && <span className="text-red" style={{ fontSize: 10 }}> (차단됨)</span>}
        </label>
        <button
          className={`toggle-btn ${settings.notifyEnabled && notifyPermission === 'granted' ? 'toggle-btn--on' : ''}`}
          onClick={handleNotifyToggle}
          disabled={notifyPermission === 'denied'}
        >
          {settings.notifyEnabled && notifyPermission === 'granted' ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="alert-panel__row">
        <label className="alert-panel__label">이미징 정지 감지</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="range"
            min={15} max={120} step={5}
            value={settings.stallThresholdSec || 30}
            onChange={e => update('stallThresholdSec', parseInt(e.target.value))}
            style={{ width: 80 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{settings.stallThresholdSec || 30}초</span>
        </div>
      </div>
    </div>
  );
}
