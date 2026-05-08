import React, { useState, useEffect, useCallback } from 'react';
import DagGraph from './DagGraph';

const ARCHIVE_API  = 'https://api.github.com/repos/pristinehwi/WorldMarketNow/contents/data/archive';
const ARCHIVE_BASE = 'https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data/archive/';

// ── 날짜별 대표 스냅샷 선택 (KST 16:00 이후 첫 번째, 없으면 가장 최신)
function pickRepresentative(files) {
  const byDate = {};
  files.forEach(f => {
    const m = f.name.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})\.json$/);
    if (!m) return;
    const dateKey = `${m[1]}-${m[2]}-${m[3]}`;
    const hour = parseInt(m[4]);
    const min  = parseInt(m[5]);
    const kstMin = hour * 60 + min;
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push({ name: f.name, kstMin });
  });

  const result = {};
  Object.entries(byDate).forEach(([date, snaps]) => {
    const afterClose = snaps.filter(s => s.kstMin >= 960).sort((a, b) => a.kstMin - b.kstMin);
    const chosen = afterClose.length > 0
      ? afterClose[0]
      : snaps.sort((a, b) => b.kstMin - a.kstMin)[0];
    result[date] = chosen.name;
  });
  return result;
}

// ── 단일 패널 (날짜 선택 + DagGraph)
function ComparePane({ paneId, dateMap, dates, selectedDate, onDateChange, otherDate, prices }) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);

  // 날짜 변경 시 데이터 로드
  useEffect(() => {
    if (!selectedDate || !dateMap[selectedDate]) {
      setData(null);
      setSelectedThread(null);
      return;
    }
    setLoading(true);
    fetch(`${ARCHIVE_BASE}${dateMap[selectedDate]}?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setSelectedThread(d.threads?.[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate, dateMap]);

  const formatDate = (d) => {
    if (!d) return '날짜 선택';
    const [, m, day] = d.match(/\d{4}-(\d{2})-(\d{2})/) || [];
    return m && day ? `${parseInt(m)}/${parseInt(day)} (${d})` : d;
  };

  const freqColor = (freq) => {
    if (!freq) return '#5b8dee';
    switch (freq.toUpperCase()) {
      case 'NOW':     return '#ff4d4d';
      case 'WEEKLY':  return '#c9a227';
      case 'MONTHLY': return '#52b788';
      default:        return '#5b8dee';
    }
  };

  return (
    <div className="acp-pane">
      {/* 패널 헤더 — 날짜 선택 */}
      <div className="acp-pane-header">
        <select
          className="acp-date-select"
          value={selectedDate || ''}
          onChange={e => onDateChange(e.target.value)}
        >
          <option value="">날짜 선택</option>
          {dates.map(d => (
            <option key={d} value={d} disabled={d === otherDate}>
              {formatDate(d)}
            </option>
          ))}
        </select>
        {data && (
          <span className="acp-meta">
            {data.meta?.is_weekend ? '주말' : ''}
            {data.data_as_of?.display_mobile || ''}
          </span>
        )}
      </div>

      {/* 스레드 탭 */}
      {data && (
        <div className="acp-thread-tabs">
          {(data.threads || [])
            .sort((a, b) => (a.priority || 9) - (b.priority || 9))
            .map(t => {
              const color = freqColor(t.frequency);
              const isActive = selectedThread?.id === t.id;
              return (
                <button
                  key={t.id}
                  className={`acp-thread-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedThread(t)}
                  style={{
                    borderColor: isActive ? color : `${color}44`,
                    color: isActive ? color : '#8888aa',
                    background: isActive ? `${color}12` : 'transparent',
                  }}
                >
                  <span className="acp-tab-freq" style={{ color }}>{t.frequency}</span>
                  <span className="acp-tab-title">{t.title}</span>
                </button>
              );
            })}
        </div>
      )}

      {/* DAG 영역 */}
      <div className="acp-dag-zone">
        {loading && (
          <div className="acp-state">
            <div className="acp-spinner" />
            <span>로딩 중...</span>
          </div>
        )}
        {!loading && !data && (
          <div className="acp-state acp-placeholder">
            <span>↑ 날짜를 선택하세요</span>
          </div>
        )}
        {!loading && data && selectedThread && (
          <DagGraph
            thread={selectedThread}
            activeTimeEvent={null}
            prices={prices}
            onNodeClick={null}
            onOpenPanel={null}
          />
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트
// ── 브리핑 아카이브 탭 ──────────────────────────────────────
const BRIEFING_INDEX = 'https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data/briefing/index.json';

function BriefingTab() {
  const [index, setIndex]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BRIEFING_INDEX}?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { setIndex(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openBriefing = (file) => {
    window.open(`https://pristinehwi.github.io/WorldMarketNow/${file}`, '_blank');
  };

  if (loading) return (
    <div className="acp-state acp-loading-full">
      <div className="acp-spinner" />
      <span>브리핑 목록 로딩 중...</span>
    </div>
  );

  if (!index || index.length === 0) return (
    <div className="acp-state">
      <span style={{ color: '#3a3a5a', fontSize: 13 }}>브리핑 아카이브가 없습니다.</span>
    </div>
  );

  return (
    <div className="briefing-tab-list">
      {[...index]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(item => (
        <div
          key={item.date}
          className="briefing-tab-item"
          onClick={() => openBriefing(item.file)}
        >
          <div className="briefing-tab-date">{item.date}</div>
          <div className="briefing-tab-headline">{item.headline_theme}</div>
          {item.today_watch && (
            <div className="briefing-tab-watch">{item.today_watch}</div>
          )}
          <div className="briefing-tab-arrow">↗</div>
        </div>
      ))}
    </div>
  );
}

export default function ArchiveCompare({ onClose, prices, embedded }) {
  const [archiveSubTab, setArchiveSubTab] = useState('compare'); // 'compare' | 'briefing'
  const [dateMap, setDateMap] = useState({});
  const [dates, setDates]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [leftDate, setLeftDate]   = useState(null);
  const [rightDate, setRightDate] = useState(null);

  useEffect(() => {
    fetch(ARCHIVE_API, { headers: { Accept: 'application/vnd.github.v3+json' } })
      .then(r => r.json())
      .then(files => {
        if (!Array.isArray(files)) return;
        const rep = pickRepresentative(files);
        const sorted = Object.keys(rep).sort();
        setDateMap(rep);
        setDates(sorted);
        if (sorted.length >= 2) {
          setLeftDate(sorted[sorted.length - 2]);
          setRightDate(sorted[sorted.length - 1]);
        } else if (sorted.length === 1) {
          setRightDate(sorted[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ESC 키로 닫기 (overlay 모드만)
  useEffect(() => {
    if (embedded) return;
    const handler = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, embedded]);

  const inner = (
    <div className={embedded ? 'acp-fullscreen acp-fullscreen--embedded' : 'acp-fullscreen'}>
      {/* 상단 바 */}
      <div className="acp-topbar">
        <div className="acp-topbar-left">
          <span className="acp-topbar-icon">
            {archiveSubTab === 'compare' ? '⏱' : '📰'}
          </span>
          <span className="acp-topbar-title">
            {archiveSubTab === 'compare' ? '시간축 비교' : '브리핑 아카이브'}
          </span>
          {archiveSubTab === 'compare' && dates.length > 0 && (
            <span className="acp-topbar-sub">{dates.length}개 스냅샷 로드됨</span>
          )}
        </div>
        {!embedded && (
          <button className="acp-topbar-close" onClick={onClose}>
            ✕ 닫기 (ESC)
          </button>
        )}
      </div>

      {/* 서브탭 */}
      <div className="acp-sub-tabs">
        <button
          className={`acp-sub-tab ${archiveSubTab === 'compare' ? 'active' : ''}`}
          onClick={() => setArchiveSubTab('compare')}
        >
          ⏱ 시간축 비교
        </button>
        <button
          className={`acp-sub-tab ${archiveSubTab === 'briefing' ? 'active' : ''}`}
          onClick={() => setArchiveSubTab('briefing')}
        >
          📰 Daily Intelligence
        </button>
      </div>

      {/* 본문 */}
      {archiveSubTab === 'briefing' ? (
        <div className="acp-briefing-zone">
          <BriefingTab />
        </div>
      ) : loading ? (
        <div className="acp-state acp-loading-full">
          <div className="acp-spinner" />
          <span>아카이브 목록 로딩 중...</span>
        </div>
      ) : (
        <div className="acp-body">
          <ComparePane
            paneId="left"
            dateMap={dateMap}
            dates={dates}
            selectedDate={leftDate}
            onDateChange={setLeftDate}
            otherDate={rightDate}
            prices={prices}
          />

          {/* 중앙 구분선 */}
          <div className="acp-divider">
            <div className="acp-divider-inner">
              <div className="acp-divider-line" />
              <span className="acp-divider-vs">VS</span>
              <div className="acp-divider-line" />
            </div>
          </div>

          <ComparePane
            paneId="right"
            dateMap={dateMap}
            dates={dates}
            selectedDate={rightDate}
            onDateChange={setRightDate}
            otherDate={leftDate}
            prices={prices}
          />
        </div>
      )}
    </div>
  );

  return inner;
}
