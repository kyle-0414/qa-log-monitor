import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Info, X } from 'lucide-react';
import { interpretLogLine, LEVEL_COLORS } from '../../lib/logInterpreter';

// 한 번에 하나만 열리도록
const InterpretContext = createContext(null);
export function InterpretProvider({ children }) {
  const [activeId, setActiveId] = useState(null);
  return (
    <InterpretContext.Provider value={{ activeId, setActiveId }}>
      {children}
    </InterpretContext.Provider>
  );
}
function useInterpret() {
  return useContext(InterpretContext) || { activeId: null, setActiveId: () => {} };
}

export default function ErrorInterpret({ message, timestamp }) {
  const { activeId, setActiveId } = useInterpret();
  const id = `${(message || '').substring(0, 40)}|${timestamp || ''}`;
  const isOpen = activeId === id;
  const wrapRef = useRef(null);

  const fakeLine = timestamp ? `${timestamp} ERROR [system] ${message}` : `ERROR ${message}`;
  const interp = interpretLogLine(fakeLine);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setActiveId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setActiveId]);

  const toggle = (e) => {
    e.stopPropagation();
    setActiveId(isOpen ? null : id);
  };

  return (
    <span ref={wrapRef} className="ei-wrap">
      <button
        className={`ei-btn ${isOpen ? 'ei-btn--on' : ''}`}
        onClick={toggle}
        title="해석 보기"
      >
        <Info size={12} />
      </button>

      {isOpen && interp && (
        <div
          className="ei-popup"
          style={{ borderColor: LEVEL_COLORS[interp.level] }}
        >
          <div className="ei-popup__title" style={{ color: LEVEL_COLORS[interp.level] }}>
            {interp.title}
          </div>
          <div className="ei-popup__summary">{interp.summary}</div>
          {interp.detail && (
            <div className="ei-popup__detail">
              {interp.detail.split('\n').map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
