import React from 'react';
import { Camera, Clock, Zap } from 'lucide-react';

export default function ImagingProgress({ obtained, total, avgMs, currentStep }) {
  if (!total || total === 0) return null;
  const isActive = currentStep === 'imaging';
  const percentage = Math.min(100, Math.round((obtained / total) * 100));
  const remaining = total - obtained;
  const etaSeconds = avgMs ? Math.round((remaining * avgMs) / 1000) : null;

  const formatEta = (sec) => {
    if (!sec || sec <= 0) return '완료';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className={`imaging-progress ${isActive ? 'imaging-progress--active' : ''}`}>
      <h3 className="section-title">
        <Camera size={16} />
        Imaging Progress
      </h3>

      <div className="imaging-progress__bar-container">
        <div className="imaging-progress__bar">
          <div
            className="imaging-progress__fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="imaging-progress__percent">{percentage}%</span>
      </div>

      <div className="imaging-progress__stats">
        <div className="imaging-stat">
          <Camera size={14} />
          <span>{obtained.toLocaleString()} / {total.toLocaleString()} spots</span>
        </div>
        {avgMs && (
          <div className="imaging-stat">
            <Zap size={14} />
            <span>{avgMs}ms / spot</span>
          </div>
        )}
        {etaSeconds !== null && isActive && (
          <div className="imaging-stat">
            <Clock size={14} />
            <span>남은 시간: ~{formatEta(etaSeconds)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
