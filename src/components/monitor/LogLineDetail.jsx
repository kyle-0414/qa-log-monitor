import React from 'react';
import { X, Info } from 'lucide-react';
import { interpretLogLine, LEVEL_COLORS, LEVEL_BG } from '../../lib/logInterpreter';

export default function LogLineDetail({ line, onClose }) {
  const interp = interpretLogLine(line);

  return (
    <div className="log-detail-panel" style={{ background: interp ? LEVEL_BG[interp.level] : 'var(--bg-secondary)' }}>
      <div className="log-detail-panel__header">
        <div className="log-detail-panel__title">
          <Info size={13} />
          <span>로그 해석</span>
        </div>
        <button className="btn btn--ghost" onClick={onClose} style={{ padding: '2px 6px' }}>
          <X size={13} />
        </button>
      </div>

      {/* 원문 */}
      <div className="log-detail-panel__raw">{line}</div>

      {interp ? (
        <div className="log-detail-panel__body">
          <div className="log-detail-panel__interp-title" style={{ color: LEVEL_COLORS[interp.level] }}>
            {interp.title}
          </div>
          <div className="log-detail-panel__summary">{interp.summary}</div>
          {interp.detail && (
            <div className="log-detail-panel__detail">
              {interp.detail.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
          {interp.tags?.length > 0 && (
            <div className="log-detail-panel__tags">
              {interp.tags.map(tag => (
                <span key={tag} className="log-detail-panel__tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="log-detail-panel__unknown">
          <span className="text-dim">이 로그 라인에 대한 해석 정보가 없어요.</span>
          <span className="text-dim" style={{ fontSize: 11 }}>디바이스 내부 동작 또는 아직 등록되지 않은 패턴이에요.</span>
        </div>
      )}
    </div>
  );
}
