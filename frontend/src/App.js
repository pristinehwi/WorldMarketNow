import React, { useState, useEffect } from 'react';
import './App.css';
import HeadlineZone from './components/HeadlineZone';
import DagGraph from './components/DagGraph';
import Timeline from './components/Timeline';
import SidePanel from './components/SidePanel';
import useMarketData from './hooks/useMarketData';
import GeoMap from './components/GeoMap';

function App() {
  const { data, loading, error } = useMarketData();
  const [selectedThread, setSelectedThread] = useState(null);
  const [activeTimeEvent, setActiveTimeEvent] = useState(null);
  const [popupNode, setPopupNode] = useState(null);

  useEffect(() => {
    if (data?.threads?.length > 0 && !selectedThread) {
      setSelectedThread(data.threads[0]);
    }
  }, [data]);

  const handleTimeEventSelect = (event) => {
    setActiveTimeEvent(event);
    setPopupNode(null);
  };

  const handleThreadSelect = (thread) => {
    setSelectedThread(thread);
    setActiveTimeEvent(null);
    setPopupNode(null);
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
        <div className="dag-container" style={{ marginRight: selectedThread ? 300 : 0 }}>
          <DagGraph
            thread={selectedThread}
            activeTimeEvent={activeTimeEvent}
            onNodeClick={(node) => setActiveTimeEvent(node)}
            popupNode={popupNode}
            setPopupNode={setPopupNode}
          />
        </div>

        <div className="timeline-container">
          <Timeline
            threads={data.threads}
            selectedThread={selectedThread}
            onThreadSelect={handleThreadSelect}
            onTimeEventSelect={handleTimeEventSelect}
          />
        </div>

        {selectedThread && (
          <div className="sidepanel-container">
            <SidePanel
              thread={selectedThread}
              onClose={() => setSelectedThread(null)}
            />
          </div>
        )}

        {/* 지도 — main-zone 기준 absolute 오버레이 */}
        <GeoMap thread={selectedThread} />
      </div>
    </div>
  );
}

export default App;