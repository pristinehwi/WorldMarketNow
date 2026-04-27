import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

const ARCHIVE_BASE = 'https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data/archive/';
const ARCHIVE_API  = 'https://api.github.com/repos/pristinehwi/WorldMarketNow/contents/data/archive';

// ── 날짜별 대표 스냅샷 선택 (KST 16:00 이후 첫 번째)
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
    // KST 16:00(960분) 이후 첫 번째 우선, 없으면 가장 최신
    const afterClose = snaps.filter(s => s.kstMin >= 960).sort((a, b) => a.kstMin - b.kstMin);
    const chosen = afterClose.length > 0 ? afterClose[0] : snaps.sort((a, b) => b.kstMin - a.kstMin)[0];
    result[date] = chosen.name;
  });
  return result; // { "2026-04-16": "20260416_1822.json", ... }
}

// ── 미니 DAG 렌더러 (d3 간소화 버전)
function MiniDag({ threads, label, highlightNodes, dimNodes }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!threads || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // NOW 스레드 중 priority 1번만 렌더
    const thread = [...threads].sort((a, b) => (a.priority || 9) - (b.priority || 9))[0];
    if (!thread) return;

    const nodes = thread.nodes || [];
    const edges = thread.edges || [];
    const W = 340, H = 280;

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', '100%');

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', `arrow-${label}`)
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 7).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#4d96ff');

    // 레벨 계산
    const levels = {};
    const inDeg = {};
    nodes.forEach(n => { inDeg[n.id] = 0; levels[n.id] = 0; });
    edges.forEach(e => { inDeg[e.to] = (inDeg[e.to] || 0) + 1; });
    const q = nodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
    while (q.length) {
      const cur = q.shift();
      edges.filter(e => e.from === cur).forEach(e => {
        levels[e.to] = Math.max(levels[e.to] || 0, (levels[cur] || 0) + 1);
        inDeg[e.to]--;
        if (inDeg[e.to] === 0) q.push(e.to);
      });
    }

    const maxLv = Math.max(...Object.values(levels), 0);
    const lvCount = {};
    const lvIdx = {};
    nodes.forEach(n => {
      const lv = levels[n.id] || 0;
      lvCount[lv] = (lvCount[lv] || 0) + 1;
    });
    nodes.forEach(n => {
      const lv = levels[n.id] || 0;
      lvIdx[lv] = (lvIdx[lv] || 0);
    });

    const pos = {};
    const tempIdx = {};
    nodes.forEach(n => {
      const lv = levels[n.id] || 0;
      tempIdx[lv] = (tempIdx[lv] || 0);
      const cnt = lvCount[lv];
      const x = 30 + lv * ((W - 60) / (maxLv || 1));
      const y = 30 + (tempIdx[lv] + 0.5) * ((H - 60) / cnt);
      pos[n.id] = { x, y };
      tempIdx[lv]++;
    });

    const NW = 80, NH = 36;

    // edges
    edges.forEach(e => {
      const s = pos[e.from], t = pos[e.to];
      if (!s || !t) return;
      svg.append('line')
        .attr('x1', s.x + NW / 2).attr('y1', s.y)
        .attr('x2', t.x - NW / 2).attr('y2', t.y)
        .attr('stroke', '#4d96ff').attr('stroke-width', 1.2).attr('stroke-opacity', 0.6)
        .attr('marker-end', `url(#arrow-${label})`);
    });

    // nodes
    nodes.forEach(n => {
      const p = pos[n.id];
      if (!p) return;

      const isHighlight = highlightNodes && highlightNodes.has(n.label);
      const isDim = dimNodes && dimNodes.has(n.label);
      const isKorea = n.id === thread.korea_terminal_node;

      const strokeColor = isHighlight ? '#52b788' : isKorea ? '#ff6b6b' : '#4d96ff';
      const fillColor   = isHighlight ? '#0a1a0a' : isKorea ? '#1a0808' : '#0e0e22';
      const opacity     = isDim ? 0.3 : 1;

      const g = svg.append('g').style('opacity', opacity);

      g.append('rect')
        .attr('x', p.x - NW / 2).attr('y', p.y - NH / 2)
        .attr('width', NW).attr('height', NH)
        .attr('rx', 6)
        .attr('fill', fillColor)
        .attr('stroke', strokeColor)
        .attr('stroke-width', isHighlight ? 1.8 : 1);

      // label (최대 6자 truncate)
      const shortLabel = (n.label || '').replace(/\([^)]+\)/, '').trim().slice(0, 6);
      g.append('text')
        .attr('x', p.x).attr('y', p.y - 4)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .attr('fill', isHighlight ? '#52b788' : '#d0d0f0')
        .text(shortLabel);

      // value (변동률만 추출)
      const pctMatch = (n.value || '').match(/([-+]?\d+\.?\d*)%/);
      if (pctMatch) {
        const pct = parseFloat(pctMatch[1]);
        g.append('text')
          .attr('x', p.x).attr('y', p.y + 10)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', pct >= 0 ? '#52b788' : '#ff6060')
          .text((pct >= 0 ? '+' : '') + pct.toFixed(1) + '%');
      }
    });

    // 스레드 제목
    svg.append('text')
      .attr('x', W / 2).attr('y', H - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#6a6a8a')
      .text(thread.title || '');

  }, [threads, label, highlightNodes, dimNodes]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
}

// ── 메인 컴포넌트
export default function ArchiveCompare({ onClose }) {
  const [dateMap, setDateMap]       = useState({}); // { date: filename }
  const [dates, setDates]           = useState([]); // 정렬된 날짜 목록
  const [leftDate, setLeftDate]     = useState(null);
  const [rightDate, setRightDate]   = useState(null);
  const [leftData, setLeftData]     = useState(null);
  const [rightData, setRightData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [loadingL, setLoadingL]     = useState(false);
  const [loadingR, setLoadingR]     = useState(false);
  const [diffMode, setDiffMode]     = useState(false);

  // 아카이브 목록 로드
  useEffect(() => {
    fetch(ARCHIVE_API, { headers: { Accept: 'application/vnd.github.v3+json' } })
      .then(r => r.json())
      .then(files => {
        if (!Array.isArray(files)) return;
        const rep = pickRepresentative(files);
        const sorted = Object.keys(rep).sort();
        setDateMap(rep);
        setDates(sorted);
        // 기본값: 가장 최근 두 날짜
        if (sorted.length >= 2) {
          setRightDate(sorted[sorted.length - 1]);
          setLeftDate(sorted[sorted.length - 2]);
        } else if (sorted.length === 1) {
          setRightDate(sorted[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 날짜 → 데이터 로드
  const loadDate = useCallback((date, side) => {
    if (!date || !dateMap[date]) return;
    if (side === 'left') setLoadingL(true);
    else setLoadingR(true);

    fetch(`${ARCHIVE_BASE}${dateMap[date]}?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (side === 'left') { setLeftData(data); setLoadingL(false); }
        else { setRightData(data); setLoadingR(false); }
      })
      .catch(() => {
        if (side === 'left') setLoadingL(false);
        else setLoadingR(false);
      });
  }, [dateMap]);

  useEffect(() => { if (leftDate) loadDate(leftDate, 'left'); }, [leftDate, loadDate]);
  useEffect(() => { if (rightDate) loadDate(rightDate, 'right'); }, [rightDate, loadDate]);

  // Diff 계산: 공통/추가/삭제 노드
  const diffResult = React.useMemo(() => {
    if (!leftData || !rightData || !diffMode) return null;
    const getLabels = (data) => {
      const s = new Set();
      (data.threads || []).forEach(t => (t.nodes || []).forEach(n => s.add(n.label)));
      return s;
    };
    const L = getLabels(leftData);
    const R = getLabels(rightData);
    const common  = new Set([...L].filter(x => R.has(x)));
    const onlyL   = new Set([...L].filter(x => !R.has(x))); // 사라진 노드
    const onlyR   = new Set([...R].filter(x => !L.has(x))); // 새로 생긴 노드
    return { common, onlyL, onlyR };
  }, [leftData, rightData, diffMode]);

  const formatDate = (d) => {
    if (!d) return '-';
    const [, m, day] = d.match(/\d{4}-(\d{2})-(\d{2})/) || [];
    return m && day ? `${parseInt(m)}/${parseInt(day)}` : d;
  };

  return (
    <div className="ac-overlay" onClick={onClose}>
      <div className="ac-panel" onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="ac-header">
          <div className="ac-title">
            <span className="ac-title-icon">⏱</span>
            시간축 비교
          </div>
          <div className="ac-header-right">
            <button
              className={`ac-diff-btn ${diffMode ? 'active' : ''}`}
              onClick={() => setDiffMode(d => !d)}
              disabled={!leftData || !rightData}
            >
              {diffMode ? 'DIFF ON' : 'DIFF OFF'}
            </button>
            <button className="ac-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Diff 범례 */}
        {diffMode && diffResult && (
          <div className="ac-diff-legend">
            <span className="ac-legend-item ac-legend-common">● 공통 노드</span>
            <span className="ac-legend-item ac-legend-new">● 새로 등장</span>
            <span className="ac-legend-item ac-legend-gone">● 사라진 노드</span>
            <span className="ac-legend-count">
              공통 {diffResult.common.size} / 신규 {diffResult.onlyR.size} / 소멸 {diffResult.onlyL.size}
            </span>
          </div>
        )}

        {loading ? (
          <div className="ac-loading">아카이브 로딩 중...</div>
        ) : dates.length === 0 ? (
          <div className="ac-loading">아카이브 없음</div>
        ) : (
          <div className="ac-body">

            {/* 왼쪽 패널 */}
            <div className="ac-side">
              <div className="ac-side-header">
                <select
                  className="ac-date-select"
                  value={leftDate || ''}
                  onChange={e => setLeftDate(e.target.value)}
                >
                  <option value="">날짜 선택</option>
                  {dates.map(d => (
                    <option key={d} value={d} disabled={d === rightDate}>
                      {formatDate(d)} ({d})
                    </option>
                  ))}
                </select>
                {leftData && (
                  <span className="ac-session-badge">
                    {leftData.meta?.market_status?.[0] || leftData.threads?.[0]?.frequency || ''}
                  </span>
                )}
              </div>

              <div className="ac-dag-area">
                {loadingL ? (
                  <div className="ac-loading">로딩 중...</div>
                ) : leftData ? (
                  <>
                    <MiniDag
                      threads={leftData.threads}
                      label="left"
                      highlightNodes={diffMode && diffResult ? diffResult.common : null}
                      dimNodes={diffMode && diffResult ? diffResult.onlyL : null}
                    />
                    <div className="ac-thread-list">
                      {(leftData.threads || []).map(t => (
                        <div key={t.id} className={`ac-thread-chip freq-${(t.frequency||'').toLowerCase()}`}>
                          <span className="ac-chip-freq">{t.frequency}</span>
                          <span className="ac-chip-title">{t.title}</span>
                        </div>
                      ))}
                    </div>
                    {diffMode && diffResult && diffResult.onlyL.size > 0 && (
                      <div className="ac-diff-tags ac-diff-gone">
                        소멸: {[...diffResult.onlyL].join(', ')}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ac-placeholder">날짜를 선택하세요</div>
                )}
              </div>
            </div>

            {/* 중앙 구분선 */}
            <div className="ac-divider">
              <div className="ac-divider-line" />
              <span className="ac-divider-vs">VS</span>
              <div className="ac-divider-line" />
            </div>

            {/* 오른쪽 패널 */}
            <div className="ac-side">
              <div className="ac-side-header">
                <select
                  className="ac-date-select"
                  value={rightDate || ''}
                  onChange={e => setRightDate(e.target.value)}
                >
                  <option value="">날짜 선택</option>
                  {dates.map(d => (
                    <option key={d} value={d} disabled={d === leftDate}>
                      {formatDate(d)} ({d})
                    </option>
                  ))}
                </select>
                {rightData && (
                  <span className="ac-session-badge">
                    {rightData.meta?.market_status?.[0] || rightData.threads?.[0]?.frequency || ''}
                  </span>
                )}
              </div>

              <div className="ac-dag-area">
                {loadingR ? (
                  <div className="ac-loading">로딩 중...</div>
                ) : rightData ? (
                  <>
                    <MiniDag
                      threads={rightData.threads}
                      label="right"
                      highlightNodes={diffMode && diffResult ? diffResult.common : null}
                      dimNodes={diffMode && diffResult ? diffResult.onlyR : null}
                    />
                    <div className="ac-thread-list">
                      {(rightData.threads || []).map(t => (
                        <div key={t.id} className={`ac-thread-chip freq-${(t.frequency||'').toLowerCase()}`}>
                          <span className="ac-chip-freq">{t.frequency}</span>
                          <span className="ac-chip-title">{t.title}</span>
                        </div>
                      ))}
                    </div>
                    {diffMode && diffResult && diffResult.onlyR.size > 0 && (
                      <div className="ac-diff-tags ac-diff-new">
                        신규: {[...diffResult.onlyR].join(', ')}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ac-placeholder">날짜를 선택하세요</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 하단 인사이트 */}
        {diffMode && diffResult && leftDate && rightDate && (
          <div className="ac-insight">
            <span className="ac-insight-label">구조 변화</span>
            <span className="ac-insight-text">
              {formatDate(leftDate)} → {formatDate(rightDate)} :
              공통 인과 노드 {diffResult.common.size}개 유지 /
              {diffResult.onlyR.size > 0 && ` 신규 등장 ${diffResult.onlyR.size}개 /`}
              {diffResult.onlyL.size > 0 && ` 소멸 ${diffResult.onlyL.size}개`}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
