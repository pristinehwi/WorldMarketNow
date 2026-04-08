import React, { useState } from 'react';

const FREQ_COLOR = {
  NOW:       '#ff4d4d',
  OVERNIGHT: '#ff4d4d',  // fallback
  WEEKLY:    '#c9a227',
  MONTHLY:   '#52b788',
};

const FREQ_LABEL = {
  NOW:       'NOW',
  OVERNIGHT: 'NOW',      // fallback
  WEEKLY:    '주간(Weekly) 흐름',
  MONTHLY:   '월간(Monthly) 흐름',
};

const FREQ_ORDER = { NOW: 0, OVERNIGHT: 0, WEEKLY: 1, MONTHLY: 2 };

function parsePct(value) {
  if (!value) return null;
  const match = (value + '').match(/([-+]?[\d.]+)%/);
  if (!match) return null;
  const pct = parseFloat(match[1]);
  return isNaN(pct) ? null : pct;
}

function getHeat(value, freq) {
  const pct = parsePct(value);
  if (pct === null) return null;
  const scale = freq === 'OVERNIGHT' ? 3 : freq === 'WEEKLY' ? 8 : 15;
  const intensity = Math.min(Math.abs(pct) / scale, 1);
  return { pct, intensity, isUp: pct >= 0 };
}

function getThreadHeat(thread) {
  if (!thread?.nodes) return null;
  let best = null;
  for (const node of thread.nodes) {
    const h = getHeat(node.value, thread.frequency);
    if (h && (!best || Math.abs(h.pct) > Math.abs(best.pct))) best = h;
  }
  return best;
}

function HeatArrow({ heat, freqColor }) {
  if (!heat) return null;
  const { pct, intensity, isUp } = heat;
  const double = intensity > 0.6;
  const arrow = isUp ? '▲' : '▼';
  const opacity = 0.5 + intensity * 0.5;
  return (
    <span
      className="thread-heat-badge"
      style={{ color: freqColor, borderColor: `${freqColor}44`, opacity }}
    >
      {double ? arrow + arrow : arrow}{' '}{pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function Timeline({ threads, selectedThread, onThreadSelect, onTimeEventSelect }) {
  const [activeFreq, setActiveFreq] = useState(null);

  const filteredThreads = activeFreq
    ? threads?.filter(t => t.frequency === activeFreq)
    : threads;

  const groupedThreads = {};
  filteredThreads?.forEach(thread => {
    const freq = thread.frequency || 'OTHER';
    if (!groupedThreads[freq]) groupedThreads[freq] = [];
    groupedThreads[freq].push(thread);
  });

  const freqGroups = Object.entries(groupedThreads).sort(
    ([a], [b]) => (FREQ_ORDER[a] ?? 9) - (FREQ_ORDER[b] ?? 9)
  );

  const allEvents = [];
  filteredThreads?.forEach(thread => {
    thread.nodes?.forEach(node => {
      if (node.timestamp && node.timestamp !== 'current' && node.timestamp !== '예상') {
        allEvents.push({ ...node, threadId: thread.id, threadTitle: thread.title, frequency: thread.frequency, thread });
      }
    });
  });
  allEvents.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  return (
    <div className="timeline">

      {/* ── 주파수 범례 ── */}
      <div className="freq-legend">
        {['OVERNIGHT', 'WEEKLY', 'MONTHLY'].map(freq => {
          const color = FREQ_COLOR[freq];
          return (
            <div key={freq} className="freq-legend-item">
              <div className="freq-legend-dot" style={{ background: color, boxShadow: `0 0 5px ${color}88` }} />
              <span className="freq-legend-label" style={{ color }}>{FREQ_LABEL[freq]}</span>
            </div>
          );
        })}
        <div className="freq-legend-divider" />
        <div className="freq-legend-item">
          <span className="freq-legend-arrow-guide">
            <span style={{ color: '#c8c8e0' }}>▲▲</span>
            <span style={{ color: '#8a8aaa', margin: '0 2px' }}>/</span>
            <span style={{ color: '#c8c8e0' }}>▼</span>
            <span style={{ color: '#9090b0', marginLeft: 4 }}>변동강도</span>
          </span>
        </div>
      </div>

      {/* ── 헤더 ── */}
      <div className="timeline-header">
        <span className="timeline-title">멀티 프리퀀시</span>
      </div>

      {/* ── 주파수 필터 탭 ── */}
      <div className="frequency-tabs">
        {['OVERNIGHT', 'WEEKLY', 'MONTHLY'].map(freq => {
          const count = threads?.filter(t => t.frequency === freq).length || 0;
          const color = FREQ_COLOR[freq];
          const isActive = activeFreq === freq;
          return (
            <div
              key={freq}
              className={`freq-tab ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? color : `${color}55`,
                background: isActive ? `${color}22` : 'transparent',
                cursor: 'pointer',
              }}
              onClick={() => setActiveFreq(prev => prev === freq ? null : freq)}
            >
              <span style={{ color, fontWeight: isActive ? 700 : 600, fontSize: 11 }}>
                {FREQ_LABEL[freq]}
              </span>
              <span className="freq-count" style={{
                background: isActive ? `${color}33` : '#14142a',
                color: isActive ? color : '#8a8aaa',
              }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── 스레드 목록 ── */}
      <div className="timeline-threads">
        {freqGroups.map(([freq, freqThreads]) => {
          const color = FREQ_COLOR[freq] || '#5b8dee';
          return (
            <div key={freq} className="thread-freq-group">
              <div className="thread-group-header">
                <div className="thread-group-line" style={{ background: color }} />
                <span className="thread-group-label" style={{ color }}>
                  {FREQ_LABEL[freq] || freq}
                </span>
                <div className="thread-group-line-right" style={{ background: color, opacity: 0.4 }} />
              </div>

              {freqThreads.map(thread => {
                const isActive = selectedThread?.id === thread.id;
                const heat = getThreadHeat(thread);
                const heatAlpha = heat ? Math.round((0.04 + heat.intensity * 0.14) * 255).toString(16).padStart(2, '0') : '00';
                const borderAlpha = heat ? Math.round((0.1 + heat.intensity * 0.35) * 255).toString(16).padStart(2, '0') : '00';

                return (
                  <div
                    key={thread.id}
                    className={`timeline-thread ${isActive ? 'active' : ''}`}
                    onClick={() => onThreadSelect(thread)}
                    style={{
                      borderLeftColor: isActive ? color : 'transparent',
                      borderLeftWidth: 3,
                      borderLeftStyle: 'solid',
                      background: isActive ? `${color}18` : `${color}${heatAlpha}`,
                      borderTopColor: `${color}${borderAlpha}`,
                      borderTopWidth: 1,
                      borderTopStyle: 'solid',
                    }}
                  >
                    <div className="thread-info">
                      <div className="thread-name" style={{ color: isActive ? '#f0f0ff' : '#d0d0e8' }}>
                        {thread.title}
                      </div>
                      <div className="thread-meta">
                        <span className="node-count">노드 {thread.nodes?.length}개</span>
                        <HeatArrow heat={heat} freqColor={color} />
                      </div>
                    </div>
                    <div className="thread-priority-badge" style={{ color }}>
                      #{thread.priority}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── 이벤트 타임라인 ── */}
      {allEvents.length > 0 && (
        <div className="event-timeline">
          <div className="event-timeline-title">
            주요 이벤트
            {activeFreq && (
              <span style={{ color: FREQ_COLOR[activeFreq], marginLeft: 6, fontSize: 10 }}>
                ({FREQ_LABEL[activeFreq]})
              </span>
            )}
          </div>
          <div className="event-timeline-list">
            {allEvents.map((event, i) => {
              const color = FREQ_COLOR[event.frequency] || '#5b8dee';
              const isLast = i === allEvents.length - 1;
              const heat = getHeat(event.value, event.frequency);
              return (
                <div
                  key={i}
                  className="timeline-event"
                  onClick={() => { onThreadSelect(event.thread); onTimeEventSelect(event); }}
                >
                  <div className="event-axis">
                    <div className="event-dot" style={{
                      background: color,
                      boxShadow: `0 0 6px ${color}88`,
                      opacity: heat ? 0.5 + heat.intensity * 0.5 : 0.7,
                    }} />
                    {!isLast && <div className="event-axis-line" />}
                  </div>
                  <div className="event-content">
                    <div className="event-time-row">
                      <span className="event-time">{event.timestamp}</span>
                      <span className="event-freq-tag" style={{ color, borderColor: `${color}55` }}>
                        {FREQ_LABEL[event.frequency] || event.frequency}
                      </span>
                      {heat && (
                        <span style={{ fontSize: 9, fontWeight: 700, color, marginLeft: 2, opacity: 0.5 + heat.intensity * 0.5 }}>
                          {heat.isUp ? '▲' : '▼'} {heat.pct > 0 ? '+' : ''}{heat.pct.toFixed(1)}%
                        </span>
                      )}
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
