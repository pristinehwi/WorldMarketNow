import React, { useState, useEffect, useRef } from 'react';

const COLOR_CYCLE = [
  '#bf5fff', // 형광보라
  '#00aaff', // 형광파랑
  '#00ff99', // 형광초록
  '#ffe033', // 형광노랑
  '#f0f0ff', // 형광흰
];

function HeadlineZone({ headline, headlines, threads, selectedThread, onThreadSelect, layerSummary, dataAsOf, generatedAt }) {

  const [displayText, setDisplayText] = useState('');
  const [charColors, setCharColors]   = useState([]);

  const phaseRef         = useRef('typing');
  const indexRef         = useRef(0);
  const holdCountRef     = useRef(0);
  const colorIndexRef    = useRef(0);
  const penPosRef        = useRef(0);
  const penFrameRef      = useRef(0);
  const headlineIndexRef = useRef(0); // 현재 몇 번째 headline인지

  const HOLD_FRAMES  = 50; // 3초 유지
  const PEN_INTERVAL = 2;  // 글자당 120ms

  // NOW 스레드 headline 목록 결정
  // headlines 배열 있으면 사용, 없으면 headline 단일값 폴백
  const nowThreads = threads
    ? threads.filter(t => t.frequency === 'NOW' || t.frequency === 'OVERNIGHT')
        .sort((a, b) => (a.priority || 9) - (b.priority || 9))
    : [];

  const headlineList = (() => {
    if (headlines && headlines.length > 0) return headlines;
    if (headline) return [headline];
    return [];
  })();

  useEffect(() => {
    if (!headlineList.length) return;

    // 초기화
    phaseRef.current         = 'typing';
    indexRef.current         = 0;
    holdCountRef.current     = 0;
    colorIndexRef.current    = 0;
    penPosRef.current        = 0;
    penFrameRef.current      = 0;
    headlineIndexRef.current = 0;

    setDisplayText('');
    setCharColors([]);

    const timer = setInterval(() => {
      const phase        = phaseRef.current;
      const currentHeadline = headlineList[headlineIndexRef.current % headlineList.length];

      if (phase === 'typing') {
        const i = indexRef.current;
        if (i < currentHeadline.length) {
          const next = currentHeadline.slice(0, i + 1);
          setDisplayText(next);
          setCharColors(Array(next.length).fill('#f0f0ff'));
          indexRef.current = i + 1;
        } else {
          phaseRef.current     = 'hold';
          holdCountRef.current = 0;
        }

      } else if (phase === 'hold') {
        holdCountRef.current += 1;
        if (holdCountRef.current >= HOLD_FRAMES) {
          // hold 끝 → 펜칠 다음 색상 시작
          colorIndexRef.current = (colorIndexRef.current + 1) % COLOR_CYCLE.length;
          penPosRef.current     = 0;
          penFrameRef.current   = 0;
          phaseRef.current      = 'pen';
        }

      } else if (phase === 'pen') {
        penFrameRef.current += 1;
        if (penFrameRef.current >= PEN_INTERVAL) {
          penFrameRef.current = 0;
          const pos      = penPosRef.current;
          const newColor = COLOR_CYCLE[colorIndexRef.current];

          if (pos < currentHeadline.length) {
            setCharColors(prev => {
              const next = [...prev];
              next[pos]  = newColor;
              return next;
            });
            penPosRef.current = pos + 1;
          } else {
            // 펜칠 완료 → 다음 headline으로 교체
            headlineIndexRef.current += 1;
            const nextHeadline = headlineList[headlineIndexRef.current % headlineList.length];

            // 새 headline 타이핑 시작
            indexRef.current     = 0;
            penPosRef.current    = 0;
            penFrameRef.current  = 0;
            holdCountRef.current = 0;
            phaseRef.current     = 'typing';
            setDisplayText('');
            setCharColors(Array(nextHeadline.length).fill('#f0f0ff'));
          }
        }
      }
    }, 60);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline, headlines]);

  // Data as of 표시 (PC/모바일 분기)
  const isMobile = window.innerWidth <= 768;
  const formatDataAsOf = () => {
    if (dataAsOf) {
      if (isMobile && dataAsOf.display_mobile) return dataAsOf.display_mobile;
      if (dataAsOf.display) return dataAsOf.display;
    }
    if (!generatedAt) return '';
    const d = new Date(generatedAt);
    const h = String(d.getUTCHours() + 9).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${h}:${m} KST`;
  };

  const freqOrder = { 'NOW': 0, 'OVERNIGHT': 0, 'WEEKLY': 1, 'MONTHLY': 2 };

  const frequencyColor = (freq) => {
    switch(freq) {
      case 'NOW':
      case 'OVERNIGHT': return '#ff4d4d';
      case 'WEEKLY':    return '#c9a227';
      case 'MONTHLY':   return '#52b788';
      default:          return '#5b8dee';
    }
  };

  const frequencyLabel = (freq) => {
    switch(freq) {
      case 'NOW':
      case 'OVERNIGHT': return 'NOW';
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

  const renderHeadline = () => {
    if (!displayText) return null;
    return [...displayText].map((char, i) => (
      <span
        key={i}
        style={{
          color: charColors[i] || '#f0f0ff',
          transition: 'color 0.15s ease',
          textShadow: charColors[i] && charColors[i] !== '#f0f0ff'
            ? `0 0 14px ${charColors[i]}` : 'none',
        }}
      >
        {char}
      </span>
    ));
  };

  return (
    <div className="headline-zone">
      {/* 상단 메타 */}
      <div className="headline-meta-row">
        <div className="generated-at">
          Data as of&nbsp;&nbsp;<span className="data-as-of-value">{formatDataAsOf()}</span>
        </div>
        <div className="live-indicator">
          <span className="live-dot" />
          <span className="live-text">LIVE</span>
        </div>
      </div>

      {/* 헤드라인 — 두 줄 고정 높이 */}
      <div className="headline-main">
        <div className="headline-text">
          {renderHeadline()}
          {phaseRef.current === 'typing' && <span className="cursor">|</span>}
        </div>

        {layerSummary && (
          <div className="layer-summary">
            <span className="layer-badge layer1">배경</span>
            <span className="layer-text">{layerSummary.layer1}</span>
          </div>
        )}
      </div>

      <div className="headline-divider" />

      {/* 스레드 탭 */}
      <div className="thread-thumbnails">
        {sortedThreads.map((thread, idx) => {
          const color    = frequencyColor(thread.frequency);
          const isActive = selectedThread?.id === thread.id;

          return (
            <div
              key={thread.id}
              className={`thread-thumb ${isActive ? 'active' : ''} freq-${thread.frequency.toLowerCase().replace(/\s/g, '')}`}
              onClick={() => onThreadSelect(thread)}
              style={{
                minWidth: isActive ? '180px' : '120px',
                maxWidth: isActive ? '255px' : '170px',
                transform: isActive ? 'translateY(-3px)' : 'none',
                transformOrigin: 'bottom center',
                zIndex: isActive ? 10 : 1,
                background: isActive ? `${color}18` : 'transparent',
                border: isActive ? `1px solid ${color}` : `1px solid ${color}44`,
                borderBottom: 'none',
              }}
            >
              <div className="thread-top-bar" style={{
                background: color,
                height: isActive ? '4px' : '2px',
                opacity: isActive ? 1 : 0.7,
                boxShadow: isActive ? `0 0 8px ${color}` : 'none',
              }} />

              <div className="thread-thumb-content">
                <div className="thread-priority-row">
                  <span className="thread-priority" style={{ background: color }}>
                    #{idx + 1}
                  </span>
                  <span className="thread-freq-label" style={{
                    color,
                    fontSize: isActive ? '10px' : '9px',
                  }}>
                    {frequencyLabel(thread.frequency)}
                  </span>
                </div>
                <div className="thread-title" style={{
                  fontSize: isActive ? '13px' : '12px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#f0f0ff' : '#c8c8e0',
                }}>
                  {thread.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HeadlineZone;
