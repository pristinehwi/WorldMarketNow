import React, { useState, useEffect } from 'react';

function HeadlineZone({ headline, threads, selectedThread, onThreadSelect, layerSummary, generatedAt }) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!headline) return;
    setDisplayText('');
    setIsTyping(true);
    let i = 0;
    const timer = setInterval(() => {
      if (i < headline.length) {
        setDisplayText(headline.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 70);
    return () => clearInterval(timer);
  }, [headline]);

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' KST';
  };

  const freqOrder = { 'OVERNIGHT': 0, 'WEEKLY': 1, 'MONTHLY': 2 };

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
      case 'OVERNIGHT': return 'OVERNIGHT';
      case 'WEEKLY':    return 'WEEKLY';
      case 'MONTHLY':   return 'MONTHLY';
      default:          return freq;
    }
  };

  const sortedThreads = threads
    ? [...threads].sort((a, b) => {
        const fo = (freqOrder[a.frequency] ?? 9) - (freqOrder[b.frequency] ?? 9);
        if (fo !== 0) return fo;
        return (a.priority || 9) - (b.priority || 9);
      })
    : [];

  return (
    <div className="headline-zone">
      {/* 상단 메타 정보 */}
      <div className="headline-meta-row">
        <div className="generated-at">{formatTime(generatedAt)} 기준</div>
        <div className="live-indicator">
          <span className="live-dot" />
          <span className="live-text">LIVE</span>
        </div>
      </div>

      {/* 헤드라인 + 배경 레이어 */}
      <div className="headline-main">
        <div className="headline-text">
          {displayText}
          {isTyping && <span className="cursor">|</span>}
        </div>

        {layerSummary && (
          <div className="layer-summary">
            <span className="layer-badge layer1">배경</span>
            <span className="layer-text">{layerSummary.layer1}</span>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="headline-divider" />

      {/* 스레드 탭 카드 — 하단에 탭처럼 붙음 */}
      <div className="thread-thumbnails">
        {sortedThreads.map((thread, idx) => {
          const color = frequencyColor(thread.frequency);
          const isActive = selectedThread?.id === thread.id;

          return (
            <div
              key={thread.id}
              className={`thread-thumb ${isActive ? 'active' : ''}`}
              onClick={() => onThreadSelect(thread)}
              style={{
                '--freq-color': color,
                borderColor: isActive ? color : `${color}44`,
                borderBottomColor: isActive ? 'transparent' : `${color}44`,
              }}
            >
              {/* 상단 프리퀀시 하이라이트 바 */}
              <div className="thread-top-bar" style={{ background: color }} />

              <div className="thread-thumb-content">
                <div className="thread-priority-row">
                  <span className="thread-priority" style={{ background: color }}>
                    #{idx + 1}
                  </span>
                  <span className="thread-freq-label" style={{ color }}>
                    {frequencyLabel(thread.frequency)}
                  </span>
                </div>
                <div className="thread-title">{thread.title}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HeadlineZone;
