import React, { useEffect, useState } from 'react';
import { Play, Square, RefreshCw, Bell } from 'lucide-react';
import { useLogStreamContext } from '../contexts/LogStreamContext';
import DeviceInfoHeader from '../components/monitor/DeviceInfoHeader';
import ProcessFlow from '../components/monitor/ProcessFlow';
import ImagingProgress from '../components/monitor/ImagingProgress';
import RawLogPanel from '../components/monitor/RawLogPanel';
import BookmarkPanel from '../components/monitor/BookmarkPanel';
import AlertSettingsPanel from '../components/monitor/AlertSettingsPanel';
import NotesBadge from '../components/common/NotesBadge';
import ErrorInterpret, { InterpretProvider } from '../components/common/ErrorInterpret';
import { useAlerts, loadAlertSettings } from '../hooks/useAlerts';

export default function MonitorPage() {
  const stream = useLogStreamContext();
  const [selectedFile, setSelectedFile] = useState('latest');
  const [fileList, setFileList] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alertSettings, setAlertSettings] = useState(loadAlertSettings);
  const isConnected = stream.connectionStatus === 'connected';

  const { requestPermission, testBeep } = useAlerts(stream, alertSettings);

  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.json())
      .then(files => setFileList(files.filter(f => !f.isCompressed)))
      .catch(() => {});
  }, []);

  const handleConnect = () => {
    stream.connect(selectedFile === 'latest' ? null : selectedFile);
  };

  return (
    <div className="monitor-page">
      <div className="monitor-page__toolbar">
        <select
          value={selectedFile}
          onChange={e => setSelectedFile(e.target.value)}
          className="file-select"
        >
          <option value="latest">Latest (auto-detect)</option>
          {fileList.map(f => (
            <option key={f.filename} value={f.filename}>
              {f.filename} ({(f.size / 1024 / 1024).toFixed(1)}MB)
            </option>
          ))}
        </select>

        {!isConnected ? (
          <button className="btn btn--primary" onClick={handleConnect}>
            <Play size={14} /> Connect
          </button>
        ) : (
          <button className="btn btn--danger" onClick={stream.disconnect}>
            <Square size={14} /> Disconnect
          </button>
        )}

        <button className="btn btn--ghost" onClick={() => {
          fetch('/api/logs').then(r => r.json())
            .then(files => setFileList(files.filter(f => !f.isCompressed)));
        }}>
          <RefreshCw size={14} />
        </button>

        <button
          className={`btn btn--ghost ${showAlerts ? 'btn--ghost-active' : ''}`}
          onClick={() => setShowAlerts(v => !v)}
          title="알림 설정"
        >
          <Bell size={14} />
        </button>
      </div>

      {showAlerts && (
        <AlertSettingsPanel
          onClose={() => setShowAlerts(false)}
          onSettingsChange={setAlertSettings}
          testBeep={testBeep}
          requestPermission={requestPermission}
        />
      )}

      <DeviceInfoHeader
        deviceInfo={stream.deviceInfo}
        connectionStatus={stream.connectionStatus}
        currentFile={stream.currentFile}
        processId={stream.processId}
      />

      <ProcessFlow steps={stream.steps} currentStep={stream.currentStep} lastLogTimestamp={stream.lastLogTimestamp} />

      <ImagingProgress
        obtained={stream.imagingObtained}
        total={stream.imagingTotal}
        avgMs={stream.imagingAvgMs}
        currentStep={stream.currentStep}
      />

      {stream.mcuStatus && (
        <div className="mcu-status">
          <h3 className="section-title">MCU Status</h3>
          <div className="mcu-status__grid">
            <div className="mcu-stat">
              <span className="mcu-stat__label">Temperature</span>
              <span className="mcu-stat__value">{stream.mcuStatus.temperature}°C</span>
            </div>
            <div className="mcu-stat">
              <span className="mcu-stat__label">Humidity</span>
              <span className="mcu-stat__value">{stream.mcuStatus.humidity}%</span>
            </div>
            <div className="mcu-stat">
              <span className="mcu-stat__label">Battery</span>
              <span className="mcu-stat__value">{stream.mcuStatus.batteryStatus} ({stream.mcuStatus.batteryCapacity}%)</span>
            </div>
            <div className="mcu-stat">
              <span className="mcu-stat__label">FailStatus</span>
              <span className={`mcu-stat__value ${stream.mcuStatus.failStatus !== '0x00' ? 'text-red' : 'text-green'}`}>
                {stream.mcuStatus.failStatus}
              </span>
            </div>
          </div>
        </div>
      )}

      <InterpretProvider>
      <div className="monitor-page__footer">
        <div className="error-summary">
          <span className={`error-badge ${stream.errorCount > 0 ? 'error-badge--has' : ''}`}>
            Errors: {stream.errorCount}
          </span>
        </div>
        {stream.errors.length > 0 && (
          <div className="error-list">
            {stream.errors.slice(-5).map((err, i) => (
              <div key={i} className="error-item">
                <span className="error-item__time">{err.timestamp?.substring(11, 19)}</span>
                <span className="error-item__msg">{err.message?.substring(0, 200)}</span>
                <ErrorInterpret message={err.message} timestamp={err.timestamp} />
                <NotesBadge message={err.message} timestamp={err.timestamp} />
              </div>
            ))}
          </div>
        )}
      </div>
      </InterpretProvider>

      <BookmarkPanel
        bookmarks={stream.bookmarks}
        onAdd={stream.addBookmark}
        onRemove={stream.removeBookmark}
        lastTimestamp={stream.lastLogTimestamp}
      />

      <RawLogPanel lines={stream.rawLines} />
    </div>
  );
}
