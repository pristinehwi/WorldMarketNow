import React, { useState, useEffect } from 'react';
import './App.css';
import HeadlineZone from './components/HeadlineZone';
import DagGraph from './components/DagGraph';
import Timeline from './components/Timeline';
import SidePanel from './components/SidePanel';
import useMarketData from './hooks/useMarketData';

function App() {
  const { data, loading, error } = useMarketData();
  const [selectedThread, setSelectedThread] = useState(null);
  const [activeTimeEvent, setActiveTimeEvent] = useState(null);
  const [showPanel, setShowPanel] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState('dag');
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (data?.threads?.length > 0 && !selectedThread) {
      setSelectedThread(data.threads[0]);
    }
  }, [data]);

  const handleTimeEventSelect = (event) => {
    setActiveTimeEvent(event);
    setShowPanel(true);
  };

  const handleThreadSelect = (thread) => {
    setSelectedThread(thread);
    setActiveTimeEvent(null);
    setShowPanel(true);
    if (isMobile) {
      setMobileTab('dag');
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

  // ── 모바일 레이아웃 ──
  if (isMobile) {
    return (
      <div className="app">
        <HeadlineZone
          headline={data.headline}
          threads={data.threads}
          selectedThread={selectedThread}
          onThreadSelect={handleThreadSelect}
          layerSummary={data.layer_summary}
          generatedAt={data.generated_at}
        />

        <div className="mobile-tab-bar">
          <button
            className={`mobile-tab ${mobileTab === 'dag' ? 'active' : ''}`}
            onClick={() => setMobileTab('dag')}
          >
            📊 인과 그래프
          </button>
          <button
            className={`mobile-tab ${mobileTab === 'list' ? 'active' : ''}`}
            onClick={() => setMobileTab('list')}
          >
            📋 스레드 목록
          </button>
        </div>

        {mobileTab === 'dag' && (
          <div className="mobile-dag-zone">
            <DagGraph
              thread={selectedThread}
              activeTimeEvent={activeTimeEvent}
              prices={data.prices}
              onNodeClick={(node) => setActiveTimeEvent(node)}
              onOpenPanel={() => setShowMobilePanel(true)}
            />
          </div>
        )}

        {mobileTab === 'list' && (
          <div className="mobile-list-zone">
            <Timeline
              threads={data.threads}
              selectedThread={selectedThread}
              onThreadSelect={handleThreadSelect}
              onTimeEventSelect={(event) => {
                handleTimeEventSelect(event);
                setMobileTab('dag');
              }}
            />
          </div>
        )}

        {showMobilePanel && selectedThread && (
          <div className="mobile-panel-overlay">
            <SidePanel
              thread={selectedThread}
              onClose={() => setShowMobilePanel(false)}
            />
          </div>
        )}
      </div>
    );
  }

  // ── PC 레이아웃 ──
  return (
    <div className="app">
      <HeadlineZone
        headline={data.headline}
        threads={data.threads}
        selectedThread={selectedThread}
        onThreadSelect={handleThreadSelect}
        layerSummary={data.layer_summary}
        generatedAt={data.generated_at}
      />

      <div className="main-zone">
        <div className="dag-container">
          <DagGraph
            thread={selectedThread}
            activeTimeEvent={activeTimeEvent}
            prices={data.prices}
            onNodeClick={(node) => { setActiveTimeEvent(node); setShowPanel(true); }}
            onOpenPanel={() => setShowPanel(true)}
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
