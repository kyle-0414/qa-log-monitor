import React from 'react';
import { Cpu, Wifi, WifiOff, Loader2 } from 'lucide-react';

const VERSION_FIELDS = [
  { key: 'cerVersion', label: 'CER App' },
  { key: 'fwVersion', label: 'System SW' },
  { key: 'hawkVersion', label: 'Hawk' },
  { key: 'sharkVersion', label: 'Shark' },
  { key: 'pressCamVersion', label: 'Press Cam' },
  { key: 'cerImagingPlugin', label: 'Imaging Plugin' },
];

export default function DeviceInfoHeader({ deviceInfo, connectionStatus, currentFile, processId }) {
  const statusIcon = {
    connected: <Wifi size={14} className="text-green" />,
    connecting: <Loader2 size={14} className="spinning text-yellow" />,
    error: <WifiOff size={14} className="text-red" />,
    disconnected: <WifiOff size={14} className="text-gray" />,
  };

  return (
    <div className="device-header">
      <div className="device-header__top">
        <div className="device-header__identity">
          <Cpu size={18} />
          <span className="device-header__id">{deviceInfo.deviceId || '—'}</span>
          <span className="device-header__model">{deviceInfo.productModel || ''}</span>
          {deviceInfo.serialNumber && (
            <span className="device-header__serial">S/N: {deviceInfo.serialNumber}</span>
          )}
        </div>
        <div className="device-header__status">
          {statusIcon[connectionStatus] || statusIcon.disconnected}
          <span className={`status-text status-text--${connectionStatus}`}>
            {connectionStatus}
          </span>
          {currentFile && <span className="device-header__file">{currentFile}</span>}
        </div>
      </div>

      {processId && (
        <div className="device-header__process">
          Test ID: <strong>{processId}</strong>
        </div>
      )}

      <div className="device-header__versions">
        {VERSION_FIELDS.map(({ key, label }) => (
          <div key={key} className="version-badge">
            <span className="version-badge__label">{label}</span>
            <span className="version-badge__value">{deviceInfo[key] || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
