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

  useEffect(() => {
    if (data?.threads?.length > 0 && !selectedThread) {
      setSelectedThread(data.threads[0]);
    }
  }, [data]);

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>시장 인과 구조 분석 중...</p>
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
      {/* HEADLINE ZONE */}
      <HeadlineZone
        headline={data.headline}
        threads={data.threads}
        selectedThread={selectedThread}
        onThreadSelect={setSelectedThread}
        layerSummary={data.layer_summary}
        generatedAt={data.generated_at}
      />

      {/* MAIN ZONE */}
      <div className="main-zone">
        <div className="dag-container">
          <DagGraph
            thread={selectedThread}
            activeTimeEvent={activeTimeEvent}
          />
        </div>
        <div className="timeline-container">
          <Timeline
            threads={data.threads}
            selectedThread={selectedThread}
            onThreadSelect={setSelectedThread}
            onTimeEventSelect={setActiveTimeEvent}
          />
        </div>
      </div>

      {/* SIDE PANEL */}
      {selectedThread && (
        <SidePanel
          thread={selectedThread}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
}

export default App;