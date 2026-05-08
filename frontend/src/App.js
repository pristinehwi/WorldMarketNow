import React, { useState, useEffect } from 'react';
import './App.css';
import HeadlineZone from './components/HeadlineZone';
import DagGraph from './components/DagGraph';
import Timeline from './components/Timeline';
import SidePanel from './components/SidePanel';
import ArchiveCompare from './components/ArchiveCompare';
import EventLog from './components/EventLog';
import MacroPanel from './components/MacroPanel';
import useMarketData from './hooks/useMarketData';

// ── 탭 상수 ──
const TABS = [
  { id: 'dag',     labelPC: 'DAG 메인',    labelMobile: 'DAG',    icon: '◈' },
  { id: 'macro',   labelPC: '매크로·금리', labelMobile: '금리',   icon: '◎' },
  { id: 'event',   labelPC: '이벤트 로그', labelMobile: '이벤트', icon: '◉' },
  { id: 'archive', labelPC: '아카이브',    labelMobile: '아카이브', icon: '▣' },
  { id: 'about',   labelPC: 'About',       labelMobile: 'About',  icon: '◌' },
];

// 탭바 높이 상수 — DagGraph containerH 계산에 사용
const PC_TAB_H    = 44;   // px
const MOBILE_TAB_H = 56;  // px

// ── 브리핑 아카이브 패널 ──
function BriefingPanel({ onClose }) {
  const [index, setIndex] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data/briefing/index.json?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { setIndex(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openBriefing = (file) => {
    window.open(`https://pristinehwi.github.io/WorldMarketNow/${file}`, '_blank');
  };

  return (
    <div className="briefing-overlay" onClick={onClose}>
      <div className="briefing-panel" onClick={e => e.stopPropagation()}>
        <div className="briefing-panel-header">
          <span className="briefing-panel-title">📰 Daily Intelligence Archive</span>
          <button className="briefing-panel-close" onClick={onClose}>✕</button>
        </div>
        <div className="briefing-panel-body">
          {loading && <div className="briefing-loading">로딩 중...</div>}
          {!loading && (!index || index.length === 0) && (
            <div className="briefing-empty">아카이브가 없습니다.</div>
          )}
          {!loading && index && index.map(item => (
            <div key={item.date} className="briefing-item" onClick={() => openBriefing(item.file)}>
              <div className="briefing-item-date">{item.date}</div>
              <div className="briefing-item-headline">{item.headline_theme}</div>
              {item.today_watch && (
                <div className="briefing-item-watch">{item.today_watch}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── About 탭 Placeholder ──
function AboutPanel() {
  return (
    <div className="macro-placeholder">
      <div className="macro-placeholder-inner">
        <div className="macro-placeholder-icon">◌</div>
        <div className="macro-placeholder-title">About</div>
        <div className="macro-placeholder-desc">
          데이터 소스 · AI 분석 방법론 · 업데이트 주기<br />
          준비 중입니다
        </div>
      </div>
    </div>
  );
}

function App() {
  const { data, loading, error } = useMarketData();
  const [selectedThread, setSelectedThread] = useState(null);
  const [activeTimeEvent, setActiveTimeEvent] = useState(null);
  const [showPanel, setShowPanel] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // ── 탭 상태 ──
  // PC: activeTab 하나로 전체 관리
  // 모바일: activeTab (5탭) + dagSubTab (dag 탭 내부 서브탭)
  const [activeTab, setActiveTab] = useState('dag');
  const [dagSubTab, setDagSubTab] = useState('graph'); // 'graph' | 'list'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (data?.threads?.length > 0 && !selectedThread) {
      setSelectedThread(data.threads[0]);
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeEventSelect = (event) => {
    setActiveTimeEvent(event);
    setShowPanel(true);
  };

  const handleThreadSelect = (thread) => {
    setSelectedThread(thread);
    setActiveTimeEvent(null);
    setShowPanel(true);
    if (isMobile) {
      setActiveTab('dag');
      setDagSubTab('graph');
      setShowMobilePanel(false);
    }
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>글로벌 시장 데이터 로딩 중...</p>
    </div>
  );
  if (error) return (
    <div className="error-screen">
      <p>데이터 로딩 오류: {error}</p>
    </div>
  );
  if (!data) return null;

  const headlineProps = {
    headline:       data.headline,
    headlines:      data.headlines,
    threads:        data.threads,
    selectedThread,
    onThreadSelect: handleThreadSelect,
    layerSummary:   data.layer_summary,
    dataAsOf:       data.dataAsOf,
    generatedAt:    data.generated_at,
  };

  // ── DAG 컨테이너 높이 계산 ──
  // PC: 100vh - 탭바(44) - 헤드라인존(72 추정)
  // 모바일: 100vh - 상단헤드라인존(72) - 하단탭바(56)
  const dagContainerH = isMobile
    ? `calc(100vh - 72px - ${MOBILE_TAB_H}px - 48px)` // 48px: dagSubTab
    : `calc(100vh - ${PC_TAB_H}px - 72px)`;

  // ── 모바일 레이아웃 ──
  if (isMobile) {
    return (
      <div className="app app--mobile">
        {/* 헤드라인존 */}
        <HeadlineZone {...headlineProps} />

        {/* 탭별 콘텐츠 */}
        {activeTab === 'dag' && (
          <>
            {/* DAG 탭 내부 서브탭 */}
            <div className="mobile-sub-tab-bar">
              <button
                className={`mobile-sub-tab ${dagSubTab === 'graph' ? 'active' : ''}`}
                onClick={() => setDagSubTab('graph')}
              >
                인과 그래프
              </button>
              <button
                className={`mobile-sub-tab ${dagSubTab === 'list' ? 'active' : ''}`}
                onClick={() => setDagSubTab('list')}
              >
                스레드 목록
              </button>
            </div>

            {dagSubTab === 'graph' && (
              <div className="mobile-dag-zone" style={{ height: dagContainerH }}>
                <DagGraph
                  thread={selectedThread}
                  activeTimeEvent={activeTimeEvent}
                  prices={data.prices}
                  onNodeClick={(node) => setActiveTimeEvent(node)}
                  onOpenPanel={() => setShowMobilePanel(true)}
                  containerH={dagContainerH}
                />
              </div>
            )}

            {dagSubTab === 'list' && (
              <div className="mobile-list-zone">
                <Timeline
                  threads={data.threads}
                  selectedThread={selectedThread}
                  onThreadSelect={handleThreadSelect}
                  onTimeEventSelect={(event) => {
                    handleTimeEventSelect(event);
                    setDagSubTab('graph');
                  }}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'macro' && (
          <MacroPanel
            yieldCurve={data.yield_curve}
            fedBalance={data.fed_balance}
            curveSimilarity={data.curve_similarity}
          />
        )}

        {activeTab === 'event' && (
          <div className="tab-fullscreen">
            <EventLog embedded />
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="tab-fullscreen">
            <ArchiveCompare embedded prices={data.prices} />
          </div>
        )}

        {activeTab === 'about' && <AboutPanel />}

        {/* 모바일 SidePanel overlay */}
        {showMobilePanel && selectedThread && (
          <div className="mobile-panel-overlay">
            <SidePanel
              thread={selectedThread}
              onClose={() => setShowMobilePanel(false)}
            />
          </div>
        )}

        {/* 하단 탭바 — 아이콘 only, 활성탭만 텍스트 */}
        <nav className="mobile-tabbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`mobile-tabbar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.labelPC}
            >
              <span className="mobile-tabbar-icon">{tab.icon}</span>
              {activeTab === tab.id && (
                <span className="mobile-tabbar-label">{tab.labelMobile}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="built-by-mobile">
          built by <span className="built-by-name" onClick={() => {
            navigator.clipboard.writeText('pristineh@gmail.com');
          }}>hwi</span>
        </div>
      </div>
    );
  }

  // ── PC 레이아웃 ──
  return (
    <div className="app app--pc">

      {/* 상단 탭바 */}
      <nav className="pc-tabbar">
        <span className="pc-tabbar-wordmark">WorldMarketNow</span>
        <div className="pc-tabbar-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`pc-tabbar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.labelPC}
            </button>
          ))}
        </div>
        <span className="pc-tabbar-timestamp">
          {data.data_as_of?.display_mobile || ''}
        </span>
      </nav>

      {/* DAG 메인 탭 */}
      {activeTab === 'dag' && (
        <>
          <HeadlineZone {...headlineProps} />
          <div className="main-zone">
            <div className="dag-container" style={{ height: dagContainerH }}>
              <DagGraph
                thread={selectedThread}
                activeTimeEvent={activeTimeEvent}
                prices={data.prices}
                onNodeClick={(node) => { setActiveTimeEvent(node); setShowPanel(true); }}
                onOpenPanel={() => setShowPanel(true)}
                containerH={dagContainerH}
              />
            </div>
            {selectedThread && showPanel && (
              <div className="sidepanel-container">
                <SidePanel
                  thread={selectedThread}
                  onClose={() => setShowPanel(false)}
                />
              </div>
            )}
            <div className="timeline-container">
              <Timeline
                threads={data.threads}
                selectedThread={selectedThread}
                onThreadSelect={handleThreadSelect}
                onTimeEventSelect={handleTimeEventSelect}
              />
            </div>
          </div>
          <BuiltBy />
        </>
      )}

      {/* 매크로·금리 탭 */}
      {activeTab === 'macro' && (
        <div className="tab-page">
          <MacroPanel
            yieldCurve={data.yield_curve}
            fedBalance={data.fed_balance}
            curveSimilarity={data.curve_similarity}
          />
        </div>
      )}

      {/* 이벤트 로그 탭 */}
      {activeTab === 'event' && (
        <div className="tab-page">
          <EventLog embedded />
        </div>
      )}

      {/* 아카이브 탭 */}
      {activeTab === 'archive' && (
        <div className="tab-page">
          <ArchiveCompare embedded prices={data.prices} />
        </div>
      )}

      {/* About 탭 */}
      {activeTab === 'about' && (
        <div className="tab-page">
          <AboutPanel />
        </div>
      )}
    </div>
  );
}

function BuiltBy() {
  const [copied, setCopied] = React.useState(false);
  const handleClick = () => {
    const parts = ['pristineh', 'gmail.com'];
    navigator.clipboard.writeText(parts.join('@'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="built-by">
      built by{' '}
      <span className="built-by-name" onClick={handleClick} title="이메일 복사">
        hwi
      </span>
      {copied && <span className="built-by-toast">이메일이 복사되었습니다</span>}
    </div>
  );
}

export default App;
