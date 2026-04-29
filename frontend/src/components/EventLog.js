import React, { useState, useEffect } from 'react';

const CATEGORY_COLOR = {
  '중앙은행': '#00aaff',
  '정치':    '#ff4d4d',
  '빅테크':  '#bf5fff',
  '기업':    '#00ff99',
  '매크로':  '#c9a227',
  '테크':    '#52b788',
};

const CATEGORIES = ['전체', '중앙은행', '정치', '빅테크', '기업', '매크로', '테크'];

function EventLog({ onClose }) {
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [activeCategory, setActiveCategory] = useState('전체');
  const [selectedEntity, setSelectedEntity] = useState(null);

  useEffect(() => {
    fetch(`https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data/event_log.json?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { setEvents(data.events || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // 전체 엔티티 목록 (알파벳 정렬)
  const allEntities = [...new Set(events.map(e => e.entity))].sort();

  // 카테고리 필터
  const categoryFiltered = activeCategory === '전체'
    ? events
    : events.filter(e => e.category === activeCategory);

  // 검색 필터
  const searchFiltered = search
    ? categoryFiltered.filter(e =>
        e.entity.toLowerCase().includes(search.toLowerCase()) ||
        e.headline.toLowerCase().includes(search.toLowerCase())
      )
    : categoryFiltered;

  // 선택된 엔티티의 로그
  const entityEvents = selectedEntity
    ? events.filter(e => e.entity === selectedEntity).sort((a, b) => b.date.localeCompare(a.date))
    : null;

  // 엔티티별 최신 이벤트 (리스트용)
  const entityLatest = {};
  searchFiltered.forEach(e => {
    if (!entityLatest[e.entity] || e.date > entityLatest[e.entity].date) {
      entityLatest[e.entity] = e;
    }
  });
  const entityList = Object.values(entityLatest).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="el-overlay" onClick={onClose}>
      <div className="el-panel" onClick={e => e.stopPropagation()}>

        {/* ── 헤더 ── */}
        <div className="el-header">
          <div className="el-title">
            <span className="el-icon">📋</span>
            이벤트 로그
            {!loading && <span className="el-count">{events.length}개</span>}
          </div>
          <button className="el-close" onClick={onClose}>✕</button>
        </div>

        {/* ── 검색 + 카테고리 ── */}
        <div className="el-controls">
          <input
            className="el-search"
            type="text"
            placeholder="🔍 인물 / 키워드 검색..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedEntity(null); }}
          />
          <div className="el-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`el-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                style={activeCategory === cat && cat !== '전체'
                  ? { borderColor: CATEGORY_COLOR[cat], color: CATEGORY_COLOR[cat], background: `${CATEGORY_COLOR[cat]}18` }
                  : {}
                }
                onClick={() => { setActiveCategory(cat); setSelectedEntity(null); }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="el-body">
          {loading && <div className="el-loading">로딩 중...</div>}

          {!loading && !selectedEntity && (
            <div className="el-entity-list">
              {entityList.length === 0 && (
                <div className="el-empty">검색 결과 없음</div>
              )}
              {entityList.map(ev => {
                const color = CATEGORY_COLOR[ev.category] || '#5b8dee';
                const count = events.filter(e => e.entity === ev.entity).length;
                return (
                  <div
                    key={ev.entity}
                    className="el-entity-item"
                    onClick={() => setSelectedEntity(ev.entity)}
                  >
                    <div className="el-entity-left">
                      <span className="el-entity-dot" style={{ background: color }} />
                      <div>
                        <div className="el-entity-name">{ev.entity}</div>
                        <div className="el-entity-latest">{ev.headline}</div>
                      </div>
                    </div>
                    <div className="el-entity-right">
                      <span className="el-entity-date">{ev.date.slice(5)}</span>
                      <span className="el-entity-count" style={{ color }}>{count}건</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && selectedEntity && entityEvents && (
            <div className="el-detail">
              <button className="el-back" onClick={() => setSelectedEntity(null)}>
                ← 목록으로
              </button>
              <div className="el-detail-title">
                <span className="el-entity-dot"
                  style={{ background: CATEGORY_COLOR[entityEvents[0]?.category] || '#5b8dee', width: 10, height: 10 }} />
                {selectedEntity}
                <span className="el-entity-count" style={{ color: CATEGORY_COLOR[entityEvents[0]?.category] }}>
                  {entityEvents.length}건
                </span>
              </div>

              <div className="el-timeline">
                {entityEvents.map((ev, i) => {
                  const color = CATEGORY_COLOR[ev.category] || '#5b8dee';
                  const isLast = i === entityEvents.length - 1;
                  return (
                    <div key={i} className="el-tl-item">
                      <div className="el-tl-axis">
                        <div className="el-tl-dot" style={{ background: color, boxShadow: `0 0 6px ${color}88` }} />
                        {!isLast && <div className="el-tl-line" />}
                      </div>
                      <div className="el-tl-content">
                        <div className="el-tl-date">{ev.date}</div>
                        <div className="el-tl-headline">
                          {ev.link
                            ? <a href={ev.link} target="_blank" rel="noopener noreferrer">{ev.headline}</a>
                            : ev.headline
                          }
                        </div>
                        {ev.headline_ko && (
                          <div className="el-tl-headline-ko">{ev.headline_ko}</div>
                        )}
                        <div className="el-tl-source">{ev.source}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventLog;
