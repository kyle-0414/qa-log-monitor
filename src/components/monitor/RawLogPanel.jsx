import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import LogLineDetail from './LogLineDetail';

const VISIBLE_TAIL = 200;
const LOAD_MORE_CHUNK = 200;

export default function RawLogPanel({ lines }) {
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_TAIL);
  const [selectedLine, setSelectedLine] = useState(null);
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (lines.length === 0) {
      setVisibleCount(VISIBLE_TAIL);
      setSelectedLine(null);
    }
  }, [lines.length === 0]);

  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length, visibleCount]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;

    if (scrollTop < 80 && visibleCount < lines.length) {
      const prevScrollHeight = scrollRef.current.scrollHeight;
      setVisibleCount((prev) => Math.min(prev + LOAD_MORE_CHUNK, lines.length));
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const newScrollHeight = scrollRef.current.scrollHeight;
          scrollRef.current.scrollTop = newScrollHeight - prevScrollHeight + scrollTop;
        }
      });
    }
  }, [visibleCount, lines.length]);

  const startIndex = Math.max(0, lines.length - visibleCount);
  const visibleLines = lines.slice(startIndex);
  const hasMore = startIndex > 0;

  return (
    <div className={`raw-log ${expanded ? 'raw-log--expanded' : ''}`}>
      <div className="raw-log__header" onClick={() => setExpanded(!expanded)}>
        <Terminal size={16} />
        <span>Raw Log ({lines.length} lines)</span>
        <span className="text-dim" style={{ fontSize: 11, marginLeft: 4 }}>— 줄 클릭 시 해석</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <>
          {/* 클릭한 줄 해석 패널 */}
          {selectedLine && (
            <LogLineDetail
              line={selectedLine}
              onClose={() => setSelectedLine(null)}
            />
          )}

          <div className="raw-log__content" ref={scrollRef} onScroll={handleScroll}>
            {hasMore && (
              <div
                className="raw-log__load-more"
                onClick={() => setVisibleCount((prev) => Math.min(prev + LOAD_MORE_CHUNK, lines.length))}
                style={{ textAlign: 'center', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-muted, #888)', fontSize: '12px', borderBottom: '1px solid var(--border-color, #333)' }}
              >
                Load more ({lines.length - visibleCount} older lines)
              </div>
            )}
            {visibleLines.map((line, i) => {
              const isError   = /ERROR/i.test(line);
              const isWarning = /WARNING/i.test(line);
              const isStep    = /\] start$/.test(line) || /\] done :/.test(line);
              const isSelected = selectedLine === line;
              return (
                <div
                  key={startIndex + i}
                  className={`raw-log__line ${
                    isError   ? 'raw-log__line--error'   :
                    isWarning ? 'raw-log__line--warning' :
                    isStep    ? 'raw-log__line--step'    : ''
                  } ${isSelected ? 'raw-log__line--selected' : ''}`}
                  onClick={() => setSelectedLine(isSelected ? null : line)}
                  title="클릭하면 이 로그를 해석해 드려요"
                >
                  {line}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
