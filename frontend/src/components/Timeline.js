import React, { useState } from 'react';

function Timeline({ threads, selectedThread, onThreadSelect, onTimeEventSelect }) {
  const [activeFreq, setActiveFreq] = useState(null);

  const frequencyColor = (freq) => {
    switch(freq) {
      case 'OVERNIGHT': return '#ff4d4d';
      case 'WEEKLY':    return '#c9a227';
      case 'MONTHLY':   return '#52b788';
      default:          return '#5b8dee';
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

  const freqOrder = { 'OVERNIGHT': 0, 'WEEKLY': 1, 'MONTHLY': 2 };

  const filteredThreads = activeFreq
    ? threads?.filter(t => t.frequency === activeFreq)
    : threads;

  // 프리퀀시별 그룹핑
  const groupedThreads = {};
  filteredThreads?.forEach(thread => {
    const freq = thread.frequency || 'OTHER';
    if (!groupedThreads[freq]) groupedThreads[freq] = [];
    groupedThreads[freq].push(thread);
  });

  const freqGroups = Object.entries(groupedThreads).sort(
    ([a], [b]) => (freqOrder[a] ?? 9) - (freqOrder[b] ?? 9)
  );

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

  // 시각 기준 정렬
  allEvents.sort((a, b) => {
    const ta = a.timestamp || '';
    const tb = b.timestamp || '';
    return tb.localeCompare(ta);
  });

  const handleFreqClick = (freq) => {
    setActiveFreq(prev => prev === freq ? null : freq);
  };

  return (
    <div className="timeline">
      {/* 헤더 */}
      <div className="timeline-header">
        <span className="timeline-title">멀티 프리퀀시</span>
        <span className="timeline-note">Claude 자동 배정</span>
      </div>

      {/* 프리퀀시 필터 탭 */}
      <div className="frequency-tabs">
        {['OVERNIGHT', 'WEEKLY', 'MONTHLY'].map(freq => {
          const count = threads?.filter(t => t.frequency === freq).length || 0;
          const color = frequencyColor(freq);
          const isActive = activeFreq === freq;
          return (
            <div
              key={freq}
              className={`freq-tab ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? color : `${color}44`,
                background: isActive ? `${color}18` : 'transparent',
                cursor: 'pointer'
              }}
              onClick={() => handleFreqClick(freq)}
            >
              <span style={{ color, fontWeight: isActive ? 700 : 500 }}>
                {frequencyLabel(freq)}
              </span>
              <span className="freq-count" style={{
                background: isActive ? `${color}33` : '#14142a',
                color: isActive ? color : '#6a6a8a'
              }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* 프리퀀시별 섹션 그룹 */}
      <div className="timeline-threads">
        {freqGroups.map(([freq, freqThreads]) => {
          const color = frequencyColor(freq);
          return (
            <div key={freq} className="thread-freq-group">
              {/* 섹션 헤더 */}
              <div className="thread-group-header">
                <div className="thread-group-line" style={{ background: color }} />
                <span className="thread-group-label" style={{ color }}>
                  {frequencyLabel(freq)}
                </span>
                <div className="thread-group-line-right" />
              </div>

              {/* 해당 프리퀀시 스레드들 */}
              {freqThreads.map(thread => (
                <div
                  key={thread.id}
                  className={`timeline-thread ${selectedThread?.id === thread.id ? 'active' : ''}`}
                  onClick={() => onThreadSelect(thread)}
                  style={{
                    borderLeftColor: selectedThread?.id === thread.id ? color : 'transparent',
                    borderLeftWidth: 3,
                    borderLeftStyle: 'solid',
                  }}
                >
                  <div className="thread-info">
                    <div className="thread-name">{thread.title}</div>
                    <div className="thread-meta">
                      <span className="node-count">노드 {thread.nodes?.length}개</span>
                    </div>
                  </div>
                  <div className="thread-priority-badge" style={{ color }}>
                    #{thread.priority}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* 이벤트 타임라인 — 시간축 시각화 */}
      {allEvents.length > 0 && (
        <div className="event-timeline">
          <div className="event-timeline-title">
            주요 이벤트
            {activeFreq && (
              <span style={{ color: frequencyColor(activeFreq), marginLeft: 6, fontSize: 10 }}>
                ({frequencyLabel(activeFreq)})
              </span>
            )}
          </div>

          {/* 시간축 */}
          <div className="event-timeline-list">
            {allEvents.map((event, i) => {
              const color = frequencyColor(event.frequency);
              const isLast = i === allEvents.length - 1;
              return (
                <div
                  key={i}
                  className="timeline-event"
                  onClick={() => {
                    onThreadSelect(event.thread);
                    onTimeEventSelect(event);
                  }}
                >
                  {/* 시간축 라인 */}
                  <div className="event-axis">
                    <div className="event-dot" style={{
                      background: color,
                      boxShadow: `0 0 6px ${color}88`
                    }} />
                    {!isLast && <div className="event-axis-line" />}
                  </div>

                  <div className="event-content">
                    <div className="event-time-row">
                      <span className="event-time">{event.timestamp}</span>
                      <span className="event-freq-tag" style={{ color, borderColor: `${color}44` }}>
                        {frequencyLabel(event.frequency)}
                      </span>
                    </div>
                    <div className="event-label">{event.label}</div>
                    <div className="event-source">{event.source}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Timeline;
