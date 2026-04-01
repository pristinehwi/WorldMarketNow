import React from 'react';

function Timeline({ threads, selectedThread, onThreadSelect, onTimeEventSelect }) {

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

  // 모든 스레드의 노드를 타임스탬프 기준으로 정렬
  const allEvents = [];
  threads?.forEach(thread => {
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

  return (
    <div className="timeline">
      <div className="timeline-header">
        <span className="timeline-title">멀티 프리퀀시 타임라인</span>
        <span className="timeline-note">Claude 자동 배정</span>
      </div>

      {/* 프리퀀시 필터 */}
      <div className="frequency-tabs">
        {['OVERNIGHT', 'WEEKLY', 'MONTHLY'].map(freq => (
          <div
            key={freq}
            className="freq-tab"
            style={{ borderColor: frequencyColor(freq) }}
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
        {threads?.map(thread => (
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
          <div className="event-timeline-title">주요 이벤트</div>
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