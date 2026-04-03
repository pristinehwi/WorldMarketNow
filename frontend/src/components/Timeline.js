import React, { useState } from 'react';

function Timeline({ threads, selectedThread, onThreadSelect, onTimeEventSelect }) {
  const [activeFreq, setActiveFreq] = useState(null); // null = 전체

  const frequencyColor = (freq) => {
    switch(freq) {
      case 'OVERNIGHT': return '#ff6b6b';
      case 'WEEKLY':    return '#ffd93d';
      case 'MONTHLY':   return '#6bcb77';
      default:          return '#4d96ff';
    }
  };

  const frequencyLabel = (freq) => {
    switch(freq) {
      case 'OVERNIGHT': return '당일';
      case 'WEEKLY':    return '주간';
      case 'MONTHLY':   return '월간';
      default:          return freq;
    }
  };

  // 프리퀀시 필터 적용된 스레드
  const filteredThreads = activeFreq
    ? threads?.filter(t => t.frequency === activeFreq)
    : threads;

  // 이벤트 수집 (필터 적용)
  const allEvents = [];
  filteredThreads?.forEach(thread => {
    thread.nodes?.forEach(node => {
      if (node.timestamp && node.timestamp !== 'current' && node.timestamp !== '예상') {
        allEvents.push({
          ...node,
          threadId: thread.id,
          threadTitle: thread.title,
          frequency: thread.frequency,
          thread
        });
      }
    });
  });

  const handleFreqClick = (freq) => {
    setActiveFreq(prev => prev === freq ? null : freq); // 토글
  };

  return (
    <div className="timeline">
      <div className="timeline-header">
        <span className="timeline-title">멀티 프리퀀시 타임라인</span>
        <span className="timeline-note">Claude 자동 배정</span>
      </div>

      {/* 프리퀀시 탭 — 클릭 필터링 */}
      <div className="frequency-tabs">
        {['OVERNIGHT', 'WEEKLY', 'MONTHLY'].map(freq => (
          <div
            key={freq}
            className={`freq-tab ${activeFreq === freq ? 'active' : ''}`}
            style={{
              borderColor: frequencyColor(freq),
              background: activeFreq === freq ? `${frequencyColor(freq)}22` : 'transparent',
              cursor: 'pointer'
            }}
            onClick={() => handleFreqClick(freq)}
          >
            <span style={{ color: frequencyColor(freq) }}>
              {frequencyLabel(freq)}
            </span>
            <span className="freq-count">
              {threads?.filter(t => t.frequency === freq).length}
            </span>
          </div>
        ))}
      </div>

      {/* 스레드 리스트 */}
      <div className="timeline-threads">
        {filteredThreads?.map(thread => (
          <div
            key={thread.id}
            className={`timeline-thread ${selectedThread?.id === thread.id ? 'active' : ''}`}
            onClick={() => onThreadSelect(thread)}
          >
            <div className="thread-freq-bar"
              style={{ background: frequencyColor(thread.frequency) }} />
            <div className="thread-info">
              <div className="thread-name">{thread.title}</div>
              <div className="thread-meta">
                <span style={{ color: frequencyColor(thread.frequency) }}>
                  {frequencyLabel(thread.frequency)}
                </span>
                <span className="node-count">
                  노드 {thread.nodes?.length}개
                </span>
              </div>
            </div>
            <div className="thread-priority-badge">
              #{thread.priority}
            </div>
          </div>
        ))}
      </div>

      {/* 이벤트 타임라인 */}
      {allEvents.length > 0 && (
        <div className="event-timeline">
          <div className="event-timeline-title">
            주요 이벤트
            {activeFreq && (
              <span style={{ color: frequencyColor(activeFreq), marginLeft: 6, fontSize: 10 }}>
                ({frequencyLabel(activeFreq)} 필터 중)
              </span>
            )}
          </div>
          {allEvents.map((event, i) => (
            <div
              key={i}
              className="timeline-event"
              onClick={() => {
                onThreadSelect(event.thread);
                onTimeEventSelect(event);
              }}
            >
              <div className="event-dot"
                style={{ background: frequencyColor(event.frequency) }} />
              <div className="event-content">
                <div className="event-time">{event.timestamp}</div>
                <div className="event-label">{event.label}</div>
                <div className="event-source">{event.source}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Timeline;