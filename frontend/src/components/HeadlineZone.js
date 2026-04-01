import React, { useState, useEffect } from 'react';

function HeadlineZone({ headline, threads, selectedThread, onThreadSelect, layerSummary, generatedAt }) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // 타이핑 애니메이션
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
    }, 80);
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

  const frequencyColor = (freq) => {
    switch(freq) {
      case 'OVERNIGHT': return '#ff6b6b';
      case 'WEEKLY':    return '#ffd93d';
      case 'MONTHLY':   return '#6bcb77';
      default:          return '#4d96ff';
    }
  };

  return (
    <div className="headline-zone">
      {/* 생성 시각 */}
      <div className="generated-at">
        {formatTime(generatedAt)} 기준
      </div>

      {/* 헤드라인 타이핑 */}
      <div className="headline-text">
        {displayText}
        {isTyping && <span className="cursor">|</span>}
      </div>

      {/* 3레이어 요약 */}
      {layerSummary && (
        <div className="layer-summary">
          <span className="layer-badge layer1">배경</span>
          <span className="layer-text">{layerSummary.layer1}</span>
        </div>
      )}

      {/* 스레드 썸네일 */}
      <div className="thread-thumbnails">
        {threads?.map((thread) => (
          <div
            key={thread.id}
            className={`thread-thumb ${selectedThread?.id === thread.id ? 'active' : ''}`}
            onClick={() => onThreadSelect(thread)}
            style={{ borderColor: frequencyColor(thread.frequency) }}
          >
            <div className="thread-priority"
              style={{ background: frequencyColor(thread.frequency) }}>
              #{thread.priority}
            </div>
            <div className="thread-title">{thread.title}</div>
            <div className="thread-freq"
              style={{ color: frequencyColor(thread.frequency) }}>
              {thread.frequency}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HeadlineZone;