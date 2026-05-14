import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

// ── ETF 공식 명칭 테이블 (발행사 공식 기준) ──────────────────
const ETF_FULLNAME = {
  // 미국 주식
  'SPY':  'SPDR S&P 500 ETF Trust',
  'QQQ':  'Invesco QQQ Trust (Nasdaq-100)',
  'DIA':  'SPDR Dow Jones Industrial Average ETF',
  'IWF':  'iShares Russell 1000 Growth ETF',
  'IWD':  'iShares Russell 1000 Value ETF',
  // 국제 주식
  'EWJ':  'iShares MSCI Japan ETF',
  'EWY':  'iShares MSCI South Korea ETF',
  'EWT':  'iShares MSCI Taiwan ETF',
  'INDA': 'iShares MSCI India ETF',
  'FXI':  'iShares China Large-Cap ETF',
  'ASHR': 'Xtrackers Harvest CSI 300 China A-Shares ETF',
  'EWA':  'iShares MSCI Australia ETF',
  'EWG':  'iShares MSCI Germany ETF',
  'EWU':  'iShares MSCI United Kingdom ETF',
  'EWQ':  'iShares MSCI France ETF',
  'EEM':  'iShares MSCI Emerging Markets ETF',
  'EWZ':  'iShares MSCI Brazil ETF',
  'ACWI': 'iShares MSCI ACWI ETF',
  // 섹터
  'XLF':  'Financial Select Sector SPDR Fund',
  'XLE':  'Energy Select Sector SPDR Fund',
  'XLK':  'Technology Select Sector SPDR Fund',
  'IGV':  'iShares Expanded Tech-Software Sector ETF',
  'XLV':  'Health Care Select Sector SPDR Fund',
  'XBI':  'SPDR S&P Biotech ETF',
  'XLI':  'Industrial Select Sector SPDR Fund',
  'XLB':  'Materials Select Sector SPDR Fund',
  'XLU':  'Utilities Select Sector SPDR Fund',
  'XLC':  'Communication Services Select Sector SPDR Fund',
  'XLY':  'Consumer Discretionary Select Sector SPDR Fund',
  'XME':  'SPDR S&P Metals & Mining ETF',
  'XAR':  'SPDR S&P Aerospace & Defense ETF',
  'EUAD': 'Global X Defense Tech UCITS ETF',
  'SOXX': 'iShares Semiconductor ETF',
  'ROBO': 'ROBO Global Robotics & Automation Index ETF',
  'BLOK': 'Amplify Transformational Data Sharing ETF',
  'IBB':  'iShares Biotechnology ETF',
  'ICLN': 'iShares Global Clean Energy ETF',
  'ARKK': 'ARK Innovation ETF',
  'VNQ':  'Vanguard Real Estate ETF',
  // 채권
  'TLT':  'iShares 20+ Year Treasury Bond ETF',
  'IEF':  'iShares 7-10 Year Treasury Bond ETF',
  'BIL':  'SPDR Bloomberg 1-3 Month T-Bill ETF',
  'TIP':  'iShares TIPS Bond ETF',
  'LQD':  'iShares iBoxx $ Investment Grade Corporate Bond ETF',
  'HYG':  'iShares iBoxx $ High Yield Corporate Bond ETF',
  'EMB':  'iShares J.P. Morgan USD Emerging Markets Bond ETF',
  'BNDX': 'Vanguard Total International Bond ETF',
  // 통화
  'UUP':  'Invesco DB US Dollar Index Bullish Fund',
  'FXE':  'Invesco CurrencyShares Euro Trust',
  'FXY':  'Invesco CurrencyShares Japanese Yen Trust',
  // 원자재
  'GLD':  'SPDR Gold Shares',
  'SLV':  'iShares Silver Trust',
  'GDX':  'VanEck Gold Miners ETF',
  'USO':  'United States Oil Fund',
  'GSG':  'iShares S&P GSCI Commodity-Indexed Trust',
  'COPX': 'Global X Copper Miners ETF',
  'LIT':  'Global X Lithium & Battery Tech ETF',
  'NLR':  'VanEck Uranium+Nuclear Energy ETF',
  'CORN': 'Teucrium Corn Fund',
  'WEAT': 'Teucrium Wheat Fund',
  // 변동성
  'VIXY': 'ProShares VIX Short-Term Futures ETF',
};

// ── 미니 차트 팝업 (C) — 수직 막대그래프 상대위치 비교 ──────
function MiniChart({ node, thread, prices, onClose }) {
  const canvasRef = useRef(null);

  // 노드 ticker 추출 (label 괄호 안) : 20260426까지의 기존 코드
  //const tickerMatch = (node.label || '').match(/\(([A-Z^0-9]+)\)/);
  //const nodeTicker = tickerMatch ? tickerMatch[1] : null;

  // 노드 : 20260427 신규 구현
  const extractTicker = (label, prices) => {
  if (!label) return null;
  // 1) 괄호 안 추출: "EWY(한국ETF)" → 'EWY' 먼저, 'XSD' 같은 비매칭은 제외
  const parenMatches = label.match(/\(([A-Z][A-Z0-9]{1,5})\)/g) || [];
  for (const m of parenMatches) {
    const t = m.slice(1, -1);
    if (prices?.[t]) return t;
  }
  // 2) label 자체가 순수 티커인지 체크: "EWT", "SOXX", "TLT" 등
  const cleanLabel = label.replace(/\s/g, '').toUpperCase();
  if (prices?.[cleanLabel]) return cleanLabel;
  // 3) label 첫 번째 단어가 티커
  const firstWord = label.split(/[\s(]/)[0].toUpperCase();
  if (prices?.[firstWord]) return firstWord;
  return null;
};
const nodeTicker = extractTicker(node.label, prices);


  // frequency 기반 변동률 키
  const freq = thread?.frequency || 'NOW';
  const changeKey = freq === 'MONTHLY' ? 'change_1m'
                  : freq === 'WEEKLY'  ? 'change_1w'
                  : 'change_1d';

  // 노드 value에서 변동률 파싱
  const value = node.value || '';
  const pctMatch = value.match(/([-+]?[\d.]+)%/);
  const nodeChangePct = pctMatch ? parseFloat(pctMatch[1]) : null;

  // 날짜 파싱
  const dateMatch2 = value.match(/\[(\d+\/\d+)\][^→]*→[^[]*\[(\d+\/\d+)\]/);
  const baseDate = dateMatch2 ? dateMatch2[1] : null;
  const currDate = dateMatch2 ? dateMatch2[2] : null;

  // 전체 prices 랭킹 (유효한 것만)
  const allRanked = React.useMemo(() => {
    if (!prices) return [];
    return Object.entries(prices)
      .filter(([, p]) => p && !p.error && p[changeKey] != null)
      .map(([ticker, p]) => ({ ticker, name: p.name, pct: p[changeKey] }))
      .sort((a, b) => b.pct - a.pct);
  }, [prices, changeKey]);

  // 표시 항목: 최고1 / ... / 근접상위2 / 선택 / 근접하위2 / ... / 최저1
  const displayItems = React.useMemo(() => {
    if (!allRanked.length) return [];
    const refPct = nodeChangePct ?? 0;
    const nodeIdx = nodeTicker
      ? allRanked.findIndex(r => r.ticker === nodeTicker)
      : allRanked.findIndex(r => Math.abs(r.pct - refPct) < 0.01);
    const effectiveIdx = nodeIdx >= 0 ? nodeIdx
      : allRanked.reduce((best, r, i) =>
          Math.abs(r.pct - refPct) < Math.abs(allRanked[best].pct - refPct) ? i : best, 0);

    const top = allRanked[0];
    const bottom = allRanked[allRanked.length - 1];
    const selected = { ...allRanked[effectiveIdx], isSelected: true };

    // 근접 상위 2개 (선택 제외)
    const above = allRanked
      .slice(0, effectiveIdx)
      .filter(r => r.ticker !== top.ticker)
      .slice(-2);
    // 근접 하위 2개 (선택 제외)
    const below = allRanked
      .slice(effectiveIdx + 1)
      .filter(r => r.ticker !== bottom.ticker)
      .slice(0, 2);

    const items = [];
    items.push({ ...top, isTop: true });
    if (above.length > 0) items.push({ type: 'ellipsis' });
    above.forEach(r => items.push(r));
    items.push(selected);
    below.forEach(r => items.push(r));
    if (below.length > 0) items.push({ type: 'ellipsis' });
    items.push({ ...bottom, isBottom: true });

    // 중복 제거
    const seen = new Set();
    return items.filter(item => {
      if (item.type === 'ellipsis') return true;
      if (seen.has(item.ticker)) return false;
      seen.add(item.ticker);
      return true;
    });
  }, [allRanked, nodeTicker, nodeChangePct]);

  // canvas에 수직 막대그래프 그리기
  useEffect(() => {
    if (!canvasRef.current || !displayItems.length) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width;
    const H = canvas.height;

    // DPR 적용 — Retina 화면에서 선명하게
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const bars = displayItems.filter(d => d.type !== 'ellipsis');
    if (!bars.length) return;

    const maxAbs = Math.max(...allRanked.map(r => Math.abs(r.pct)), 0.1);
    const totalCols = displayItems.length;
    const colW = W / totalCols;
    const topPad = 80;
    const botPad = 80;
    const zeroY = topPad + (H - topPad - botPad) / 2;
    const maxBarH = (H - topPad - botPad) / 2 - 4;

    let colIdx = 0;
    displayItems.forEach((item) => {
      const cx = colIdx * colW + colW / 2;
      colIdx++;

      if (item.type === 'ellipsis') {
        ctx.font = 'bold 11px Inter';
        ctx.fillStyle = '#4a4a6a';
        ctx.textAlign = 'center';
        ctx.fillText('...', cx, zeroY + 4);
        return;
      }

      const pct = item.pct;
      const isUp = pct >= 0;
      const barH = Math.abs(pct) / maxAbs * maxBarH;
      const barW = colW * 0.50;
      const isSelected = item.isSelected;

      // 색상
      let color;
      if (isSelected) color = '#ffffff';
      else if (item.isTop) color = '#52b788';
      else if (item.isBottom) color = '#ff4d4d';
      else color = isUp ? '#52b788' : '#ff4d4d';

      // 막대
      ctx.globalAlpha = isSelected ? 1.0 : (item.isTop || item.isBottom ? 0.85 : 0.55);
      if (isUp) {
        ctx.fillStyle = color;
        ctx.fillRect(cx - barW / 2, zeroY - barH, barW, barH);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(cx - barW / 2, zeroY, barW, barH);
      }
      ctx.globalAlpha = 1.0;

      // 선택된 항목 테두리
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        if (isUp) ctx.strokeRect(cx - barW / 2, zeroY - barH, barW, barH);
        else ctx.strokeRect(cx - barW / 2, zeroY, barW, barH);
      }

      // 티커 레이블 — 선택만 bold
      ctx.font = isSelected ? 'bold 16px Inter' : '14px Inter';
      ctx.fillStyle = isSelected ? '#ffffff' : '#c8c8e0';
      ctx.textAlign = 'center';
      ctx.fillText(item.ticker, cx, isUp ? zeroY - barH - 8 : zeroY + barH + 20);

      // % 레이블
      ctx.font = isSelected ? 'bold 14px Inter' : '12px Inter';
      ctx.fillStyle = color;
      ctx.fillText((pct > 0 ? '+' : '') + pct.toFixed(1) + '%', cx,
        isUp ? zeroY - barH - 26 : zeroY + barH + 38);
    });

    // 0선
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(W, zeroY);
    ctx.stroke();

  }, [displayItems, allRanked]);

  // ETF 공식 명칭: 테이블 우선, 없으면 prices.name
  const etfName = nodeTicker
    ? (ETF_FULLNAME[nodeTicker] || prices?.[nodeTicker]?.name || null)
    : null;

  const isUp = nodeChangePct !== null ? nodeChangePct >= 0 : null;
  const pctColor = '#ffffff';

  // ── 개념 노드 판별: ticker 없거나 prices에 가격 데이터 없음
  const isConcept = !nodeTicker || !prices?.[nodeTicker];

  // ── 개념 노드: 연결된 edges 찾기
  const relatedEdges = React.useMemo(() => {
    if (!isConcept || !thread) return [];
    const edges = thread.edges || [];
    return edges.filter(e => e.from === node.id || e.to === node.id).map(e => {
      const fromNode = (thread.nodes || []).find(n => n.id === e.from);
      const toNode   = (thread.nodes || []).find(n => n.id === e.to);
      return {
        label: e.label,
        from: fromNode?.label || e.from,
        to:   toNode?.label   || e.to,
        dir: e.from === node.id ? 'out' : 'in',
      };
    });
  }, [isConcept, thread, node]);

  // ── 개념 노드 팝업
  if (isConcept) {
    return (
      <div className="mini-chart-popup" onClick={(e) => e.stopPropagation()}>
        <div className="mini-chart-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
            <span className="mini-chart-label" style={{ fontSize: 18, fontWeight: 700, color: '#f0f0ff' }}>
              {node.label}
            </span>
            {node.source && (
              <span style={{ fontSize: 11, color: '#ff9de2' }}>{node.source}</span>
            )}
          </div>
          <button className="mini-chart-close" onClick={onClose}>✕</button>
        </div>

        {/* 개념 설명 */}
        {value && (
          <div style={{
            margin: '10px 0',
            padding: '10px 12px',
            background: '#0e0e28',
            borderRadius: 8,
            border: '1px solid #2a2a4a',
            fontSize: 13,
            color: '#c8c8e0',
            lineHeight: 1.7,
          }}>
            {value}
          </div>
        )}

        {/* 연결된 인과 관계 */}
        {relatedEdges.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: '#6a6a8a', marginBottom: 6, letterSpacing: 0.5 }}>
              인과 연결고리
            </div>
            {relatedEdges.map((e, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 0',
                borderBottom: i < relatedEdges.length - 1 ? '1px solid #1a1a2e' : 'none',
                fontSize: 12,
              }}>
                {e.dir === 'out' ? (
                  <>
                    <span style={{ color: '#52b788', fontWeight: 600 }}>{e.from}</span>
                    <span style={{ color: '#4d96ff', fontSize: 10, padding: '1px 6px', background: '#0e1e3a', borderRadius: 3 }}>{e.label}</span>
                    <span style={{ color: '#c8c8e0' }}>→ {e.to}</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#c8c8e0' }}>{e.from} →</span>
                    <span style={{ color: '#4d96ff', fontSize: 10, padding: '1px 6px', background: '#0e1e3a', borderRadius: 3 }}>{e.label}</span>
                    <span style={{ color: '#52b788', fontWeight: 600 }}>{e.to}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 관련 뉴스 (Claude가 related_news 필드 생성 시) */}
        {node.related_news?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: '#c8c8e0', marginBottom: 6, letterSpacing: 0.5, fontWeight: 600 }}>
              관련 뉴스
            </div>
            {node.related_news.map((news, i) => (
              <div key={i} style={{
                padding: '6px 10px',
                marginBottom: 4,
                background: '#0a0a1e',
                borderRadius: 6,
                borderLeft: '2px solid #4d96ff',
                fontSize: 13,
                color: '#cc88ff',
                lineHeight: 1.5,
              }}>
                {news.source && (
                  <span style={{ color: '#ff9de2', fontSize: 11, marginRight: 6, fontWeight: 600 }}>
                    [{news.source}]
                  </span>
                )}
                {news.title || news}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── 가격 노드 팝업 (기존 막대그래프)
  return (
    <div className="mini-chart-popup" onClick={(e) => e.stopPropagation()}>
      <div className="mini-chart-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
          <span className="mini-chart-label" style={{ fontSize: 18, fontWeight: 700, color: '#f0f0ff' }}>
            {node.label}
          </span>
          {etfName && (
            <span style={{ fontSize: 12, color: '#ff9de2', fontWeight: 500 }}>
              {etfName}
            </span>
          )}
        </div>
        {nodeChangePct !== null && (
          <span className="mini-chart-pct" style={{ color: pctColor, fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
            {isUp ? '+' : ''}{nodeChangePct.toFixed(2)}%
          </span>
        )}
        <button className="mini-chart-close" onClick={onClose}>✕</button>
      </div>

      {/* 가격 정보 */}
      {value && (
        <div className="mini-chart-value" style={{ marginBottom: 8 }}>
          {baseDate && currDate ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 9, color: '#6a6a8a', marginBottom: 1 }}>기저 ({baseDate})</div>
                <div style={{ fontSize: 12, color: '#c8c8e0', fontWeight: 600 }}>
                  {value.match(/\[\d+\/\d+\]\s*\$?([\d,.]+)/)?.[1] || '-'}
                </div>
              </div>
              <div style={{ color: '#4a4a6a', fontSize: 14 }}>→</div>
              <div>
                <div style={{ fontSize: 9, color: '#6a6a8a', marginBottom: 1 }}>평가 ({currDate})</div>
                <div style={{ fontSize: 12, color: pctColor, fontWeight: 700 }}>
                  {value.match(/→[^(]*\[[\d/]+\]\s*\$?([\d,.]+)/)?.[1] || '-'}
                  {nodeChangePct !== null && ` (${isUp ? '+' : ''}${nodeChangePct.toFixed(2)}%)`}
                </div>
              </div>
            </div>
          ) : (
            // NOW 스레드: 날짜 없이 기저/현재
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 9, color: '#6a6a8a', marginBottom: 1 }}>전일 종가</div>
                <div style={{ fontSize: 12, color: '#c8c8e0', fontWeight: 600 }}>
                  {value.match(/\$?([\d,.]+)\s*→/)?.[1] || value.split('→')[0]?.replace(/[^0-9.,]/g,'') || '-'}
                </div>
              </div>
              <div style={{ color: '#4a4a6a', fontSize: 14 }}>→</div>
              <div>
                <div style={{ fontSize: 9, color: '#6a6a8a', marginBottom: 1 }}>현재가</div>
                <div style={{ fontSize: 12, color: pctColor, fontWeight: 700 }}>
                  {value.match(/→\s*\$?([\d,.]+)/)?.[1] || '-'}
                  {nodeChangePct !== null && ` (${isUp ? '+' : ''}${nodeChangePct.toFixed(2)}%)`}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 수직 막대그래프 */}
      {displayItems.length > 0 ? (
        <canvas ref={canvasRef} width={520} height={400} className="mini-chart-canvas" />
      ) : (
        <div style={{ color: '#4a4a6a', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
          비교 데이터 없음
        </div>
      )}

    </div>
  );
}

// ── DAG 메인 ────────────────────────────────────────────────
function DagGraph({ thread, activeTimeEvent, prices, onNodeClick, onOpenPanel, edgeStats }) {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [miniChartNode, setMiniChartNode] = useState(null);
  const [miniChartPos, setMiniChartPos] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef(null);
  const pulseAnimsRef = useRef([]);
  const [showPinchHint, setShowPinchHint] = React.useState(false);

  // 스레드 전환 시 미니차트 닫기
  useEffect(() => {
    setSelectedNode(null);
    setMiniChartNode(null);
  }, [thread]);

  // 모바일 핀치 힌트 — 최초 1회
  useEffect(() => {
    const isMobile = window.innerWidth < 600;
    if (!isMobile) return;
    const seen = localStorage.getItem('wmn_pinch_hint_seen');
    if (seen) return;
    setShowPinchHint(true);
    const t = setTimeout(() => {
      setShowPinchHint(false);
      localStorage.setItem('wmn_pinch_hint_seen', '1');
    }, 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!thread || !svgRef.current) return;
    const observer = new ResizeObserver(() => drawDAG(thread, activeTimeEvent));
    observer.observe(svgRef.current.parentElement);
    drawDAG(thread, activeTimeEvent);
    return () => {
      observer.disconnect();
      pulseAnimsRef.current.forEach(id => {
        clearTimeout(id);
        cancelAnimationFrame(id);
      });
      pulseAnimsRef.current = [];
    };
  }, [thread, activeTimeEvent]);

  const assignLevels = (nodes, edges) => {
    const levels = {};
    const inDegree = {};
    nodes.forEach(n => { inDegree[n.id] = 0; levels[n.id] = 0; });
    edges.forEach(e => { inDegree[e.to] = (inDegree[e.to] || 0) + 1; });
    const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    while (queue.length > 0) {
      const cur = queue.shift();
      edges.filter(e => e.from === cur).forEach(e => {
        levels[e.to] = Math.max(levels[e.to] || 0, (levels[cur] || 0) + 1);
        inDegree[e.to]--;
        if (inDegree[e.to] === 0) queue.push(e.to);
      });
    }
    return levels;
  };

  const getAncestorChain = (targetNodeId, edges) => {
    const ancestors = new Set();
    const queue = [targetNodeId];
    while (queue.length > 0) {
      const cur = queue.shift();
      ancestors.add(cur);
      edges.filter(e => e.to === cur).forEach(e => {
        if (!ancestors.has(e.from)) queue.push(e.from);
      });
    }
    return ancestors;
  };

  const getOrderedChain = (chainSet, levels) =>
    Array.from(chainSet).sort((a, b) => (levels[a] || 0) - (levels[b] || 0));

  const estimateTextWidth = (text, fontSize = 10) => {
    if (!text) return 0;
    let width = 0;
    for (const ch of text) {
      width += ch.charCodeAt(0) > 127 ? fontSize * 1.5 : fontSize * 0.7;
    }
    return width;
  };

  const calcNodeSize = (label, value, scale = 1.0, mobile = false) => {
    const fs = Math.round(10 * scale);
    const labelLines = (label || '').split(' ');
    const maxLabelW = Math.max(...labelLines.map(w => estimateTextWidth(w, fs)));
    let valueW = 0, valueLines = 1;
    if (value) {
      const arrowIdx = value.indexOf('→');
      const parenIdx = value.lastIndexOf('(');
      if (arrowIdx > -1) {
        const cleanValue = value.replace(/\[\d+\/\d+\]\s*/g, '');
        const cleanParen = cleanValue.lastIndexOf('(');
        const priceLine = cleanParen > -1 ? cleanValue.slice(0, cleanParen).trim() : cleanValue;
        const pctPart = parenIdx > arrowIdx ? value.slice(parenIdx).trim() : '';
        valueW = Math.max(
          estimateTextWidth(priceLine, fs - 1),
          estimateTextWidth(pctPart, fs)
        );
        valueLines = pctPart ? 3 : 2;
      } else {
        // 개념 노드: 긴 텍스트를 최대 너비 140px 기준으로 줄 수 계산
        const maxConceptW = Math.round(140 * scale);
        valueW = Math.min(estimateTextWidth(value, fs - 1), maxConceptW);
        valueLines = Math.ceil(estimateTextWidth(value, fs - 1) / maxConceptW);
        valueLines = Math.max(1, Math.min(valueLines, 4)); // 최대 4줄
      }
    }
    // 모바일에서 label 줄 수가 많을수록 패딩을 더 넉넉하게
    const basePad = mobile ? 70 : 44;
    const labelLinePad = Math.max(0, (labelLines.length - 2) * 8);
    const pad = Math.round((basePad + labelLinePad) * scale);
    const nodeW = Math.max(Math.round(130 * scale), maxLabelW + pad, valueW + pad);
    // nodeH: label줄 + value줄 + 여유 패딩
    const nodeH = Math.max(Math.round(50 * scale), labelLines.length * Math.round(15 * scale) + valueLines * Math.round(15 * scale) + Math.round(32 * scale));
    return { nodeW, nodeH, fs, scale };
  };

  const drawDAG = (thread, activeEvent) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    pulseAnimsRef.current.forEach(id => clearTimeout(id));
    pulseAnimsRef.current = [];

    const nodes = thread.nodes || [];
    const edges = thread.edges || [];
    const levels = assignLevels(nodes, edges);
    const maxLevel = Math.max(...Object.values(levels), 0);

    // 노드 수와 컨테이너 크기 기반으로 노드 스케일 자동 결정
    // 노드가 적을수록 박스를 크게, 많을수록 작게
    const containerW = svgRef.current.parentElement.clientWidth || 800;
    const containerH = svgRef.current.parentElement.clientHeight || 520;
    const nodeCount = nodes.length;
    const isMobileView = containerW < 600;
    const autoScale = (nodeCount <= 4 ? 1.3
      : nodeCount <= 6 ? 1.15
      : nodeCount <= 8 ? 1.05
      : nodeCount <= 10 ? 0.97
      : 0.90) * (isMobileView ? 1.6 : 1.0);

    const nodeSizes = {};
    nodes.forEach(n => { nodeSizes[n.id] = calcNodeSize(n.label, n.value, autoScale, isMobileView); });
    const maxNodeW = Math.max(...Object.values(nodeSizes).map(s => s.nodeW));
    const maxNodeH = Math.max(...Object.values(nodeSizes).map(s => s.nodeH));

    const minNeededW = (maxLevel + 1) * (maxNodeW + 60) + 80;
    // 노드 수 기반 최소 높이 (노드당 평균 높이 + 간격 보장)
    const minNeededH = nodes.length * (maxNodeH + 40) + 100;
    const CANVAS_W = Math.max(containerW, minNeededW);
    const CANVAS_H = Math.max(containerH, 420, minNeededH);
    const PADDING_X = maxNodeW / 2 + 20;
    const PADDING_Y = 50;

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    const zoom = d3.zoom()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => zoomGroup.attr('transform', event.transform));
    svg.call(zoom);

    // bbox 기반 초기 fit (모바일) — 노드 렌더 완료 후 실행
    const applyInitialFit = () => {
      if (!isMobileView) return;
      try {
        const bbox = zoomGroup.node().getBBox();
        if (!bbox || bbox.width === 0) return;
        const scaleX = containerW / (bbox.width  + 40);
        const scaleY = containerH / (bbox.height + 40);
        const fitScale = Math.max(0.45, Math.min(scaleX, scaleY, 1.0));
        const tx = (containerW - bbox.width  * fitScale) / 2 - bbox.x * fitScale;
        const ty = (containerH - bbox.height * fitScale) / 2 - bbox.y * fitScale;
        svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(fitScale));
      } catch(e) { /* bbox 계산 실패 시 무시 */ }
    };


    // 레이어 순서: edge → pulse → node (pulse가 노드에 가려지지 않게)
    const edgeLayer = zoomGroup.append('g').attr('class', 'edge-layer');
    const pulseLayer = zoomGroup.append('g').attr('class', 'pulse-layer');
    const nodeLayer = zoomGroup.append('g').attr('class', 'node-layer');

    svg.on('click', (event) => {
      if (event.target === svgRef.current || event.target.tagName === 'svg') {
        setSelectedNode(null);
        setMiniChartNode(null);
      }
    });

    let activeChain = null, orderedChain = null;
    // activeEvent가 현재 스레드 노드에 실제로 존재할 때만 chain 생성
    const activeEventInThread = activeEvent && nodes.some(n => n.id === activeEvent.id);
    if (activeEventInThread) {
      activeChain = getAncestorChain(activeEvent.id, edges);
      orderedChain = getOrderedChain(activeChain, levels);
    }

    const levelCounts = {};
    nodes.forEach(n => {
      const lv = levels[n.id] || 0;
      levelCounts[lv] = (levelCounts[lv] || 0) + 1;
    });

    const nodePos = {};
    const levelCounter = {};
    nodes.forEach(n => {
      const lv = levels[n.id] || 0;
      levelCounter[lv] = levelCounter[lv] || 0;
      const count = levelCounts[lv];
      const x = PADDING_X + lv * ((CANVAS_W - PADDING_X * 2) / (maxLevel === 0 ? 1 : maxLevel));
      const y = PADDING_Y + (levelCounter[lv] + 0.5) * ((CANVAS_H - PADDING_Y * 2) / count);
      nodePos[n.id] = { x, y };
      levelCounter[lv]++;
    });

    // ── defs: 화살표 + 글로우 필터 ──
    const defs = svg.append('defs');

    // 글로우 필터
    const glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // 펄스용 그라디언트 (A)
    const pulseGrad = defs.append('linearGradient')
      .attr('id', 'pulse-grad')
      .attr('gradientUnits', 'userSpaceOnUse');
    pulseGrad.append('stop').attr('offset', '0%').attr('stop-color', '#4d96ff').attr('stop-opacity', '0');
    pulseGrad.append('stop').attr('offset', '50%').attr('stop-color', '#7bb8ff').attr('stop-opacity', '1');
    pulseGrad.append('stop').attr('offset', '100%').attr('stop-color', '#4d96ff').attr('stop-opacity', '0');

    ['arrow', 'arrow-active', 'arrow-dim'].forEach((id, idx) => {
    defs.append('marker')
      .attr('id', 'arrow-fragile')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#f59e0b');
    defs.append('marker')
      .attr('id', 'arrow-missing')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#6366f1');
      const colors = ['#4d96ff', '#7bb8ff', '#1e1e2e'];
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', colors[idx]);
    });

    // ── B: 스레드 전환 애니메이션 — 노드들이 아래서 올라오며 페이드인 ──
    const threadKey = thread.id || thread.title;

    // ── edge_stats 맵 준비 (label: "fromLabel→toLabel" → realizationRate) ──
    const edgeStatMap = {};
    if (edgeStats?.edge_stats) {
      Object.entries(edgeStats.edge_stats).forEach(([k, v]) => {
        edgeStatMap[k] = v;
      });
    }
    // chainFragility: 가장 취약한 엣지 (from→to 형태)
    const fragileEdgeKey = thread.chainFragility?.fragileEdge || null;

    // ── edges 그리기 ──
    const edgeGroups = []; // 펄스 대상: 화면에 보이는 모든 edge
    edges.forEach((edge, ei) => {
      const src = nodePos[edge.from];
      const tgt = nodePos[edge.to];
      if (!src || !tgt) return;
      const isActive = activeChain
        ? activeChain.has(edge.from) && activeChain.has(edge.to)
        : true;

      // fragile 엣지 판정
        const edgeKey = `${edge.from}→${edge.to}`;
        const edgeLabelKey = (() => {
          const fn = nodes.find(n => n.id === edge.from);
          const tn = nodes.find(n => n.id === edge.to);
          return fn && tn ? `${fn.label}→${tn.label}` : null;
        })();
        const isFragile = fragileEdgeKey && (
          fragileEdgeKey === edgeKey ||
          fragileEdgeKey === edgeLabelKey ||
          (edgeLabelKey && fragileEdgeKey.includes(edgeLabelKey.slice(0,6)))
        );
        // edge_stats 두께 결정
        const statEntry = edgeLabelKey ? (edgeStatMap[edgeLabelKey] || null) : null;
        const realizationRate = statEntry?.realizationRate ?? null;
        const edgeStrokeW = (() => {
          if (!isActive) return 1;
          if (isFragile) return 2.2;
          if (realizationRate !== null) {
            if (realizationRate >= 0.8) return 3.0;
            if (realizationRate >= 0.6) return 2.2;
            if (realizationRate < 0.4)  return 1.0;
          }
          return 1.8;
        })();
        const edgeStroke = isFragile ? '#f59e0b' : (isActive ? '#4d96ff' : '#1e1e2e');

        const lineEl = edgeLayer.append('line')
        .attr('x1', src.x + (nodeSizes[edge.from]?.nodeW ?? 88) / 2)
        .attr('y1', src.y)
        .attr('x2', tgt.x - (nodeSizes[edge.to]?.nodeW ?? 88) / 2)
        .attr('y2', tgt.y)
        .attr('stroke', edgeStroke)
        .attr('stroke-width', edgeStrokeW)
        .attr('stroke-opacity', 0)
        .attr('marker-end', isFragile ? 'url(#arrow-fragile)' : (isActive ? 'url(#arrow)' : 'url(#arrow-dim)'))
        .attr('stroke-dasharray', isFragile ? '6,3' : null)

      lineEl.transition()
        .delay(ei * 40 + 100)
        .duration(400)
        .attr('stroke-opacity', isActive ? 0.85 : 0.25);

      if (edge.label) {
        const ex1 = src.x + (nodeSizes[edge.from]?.nodeW ?? 88) / 2;
        const ex2 = tgt.x - (nodeSizes[edge.to]?.nodeW ?? 88) / 2;
        const mx = (ex1 + ex2) / 2;
        const my = (src.y + tgt.y) / 2;
        // edge label 폰트: 연결된 두 노드 fs 평균
        const srcFs = nodeSizes[edge.from]?.fs ?? 11;
        const tgtFs = nodeSizes[edge.to]?.fs ?? 11;
        const edgeLabelFs = Math.round((srcFs + tgtFs) / 2);
        const labelEl = edgeLayer.append('text')
          .attr('x', mx).attr('y', my - 7)
          .attr('text-anchor', 'middle')
          .attr('font-size', `${edgeLabelFs}px`)
          .attr('font-weight', '600')
          .attr('fill', isFragile ? '#f59e0b' : (isActive ? '#d8d8ff' : '#3a3a5a'))
          .attr('stroke', '#080810')
          .attr('stroke-width', '3')
          .attr('paint-order', 'stroke')
          .style('opacity', 0)
          .text(edge.label);
        labelEl.transition().delay(ei * 40 + 300).duration(300).style('opacity', isActive ? 1 : 0.4);
      }

      // 노드 경계 기준 실제 선분 시작/끝점
      const edgeSrc = { x: src.x + (nodeSizes[edge.from]?.nodeW ?? 88) / 2, y: src.y };
      const edgeTgt = { x: tgt.x - (nodeSizes[edge.to]?.nodeW ?? 88) / 2, y: tgt.y };

      if (isActive) edgeGroups.push({ edge, src: edgeSrc, tgt: edgeTgt, lineEl, isActive });
    });

    // ── A: 무한반복 펄스 — 시간 기반 (steps 오프셋 문제 완전 제거) ──
    const PULSE_SPEED = 1800; // ms per edge traversal
    const TAIL = 0.20;

    const runEdgePulse = () => {
      edgeGroups.forEach(({ src, tgt }, idx) => {
        const dx = tgt.x - src.x;
        const rawDy = tgt.y - src.y;
        const isHorizontal = Math.abs(rawDy) < 5;
        const dy = isHorizontal ? 0.5 : rawDy;
        const pulseWidth = isHorizontal ? 6 : 3;

        const pulseLine = pulseLayer.append('path')
          .attr('stroke', '#a8d4ff')
          .attr('stroke-width', pulseWidth)
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .attr('filter', 'url(#glow)')
          .style('opacity', 0)
          .style('pointer-events', 'none');

        const phaseShift = (idx / edgeGroups.length) * PULSE_SPEED;
        const startTime = performance.now() - phaseShift;

        const tick = () => {
          const elapsed = performance.now() - startTime;
          const progress = (elapsed % PULSE_SPEED) / PULSE_SPEED;
          const tailStart = Math.max(0, progress - TAIL);

          const x1 = src.x + dx * tailStart;
          const y1 = src.y + dy * tailStart;
          const x2 = src.x + dx * progress;
          const y2 = src.y + dy * progress;

          pulseLine
            .attr('d', `M ${x1} ${y1} L ${x2} ${y2}`)
            .style('opacity',
              progress < 0.07 ? progress / 0.07 * 0.85 :
              progress > 0.90 ? (1 - progress) / 0.10 * 0.85 : 0.85
            );

          const rafId = requestAnimationFrame(tick);
          pulseAnimsRef.current.push(rafId);
        };

        const startTid = setTimeout(() => {
          const rafId = requestAnimationFrame(tick);
          pulseAnimsRef.current.push(rafId);
        }, 500);
        pulseAnimsRef.current.push(startTid);
      });
    };

    const pulseStartTid = setTimeout(runEdgePulse, 300);
    pulseAnimsRef.current.push(pulseStartTid);

    // ── nodes 그리기 ──
    nodes.forEach((node, ni) => {
      const pos = nodePos[node.id];
      if (!pos) return;
      const isInChain = activeChain ? activeChain.has(node.id) : true;
      const isTarget = activeEvent && node.id === activeEvent.id;
      const isKorea = node.id === thread.korea_terminal_node;
      const chainIndex = orderedChain ? orderedChain.indexOf(node.id) : -1;
      const animDelay = chainIndex >= 0 ? chainIndex * 180 : 0;

      const { nodeW, nodeH } = nodeSizes[node.id] || calcNodeSize(node.label, node.value);
      const rx = 10;

      const strokeColor = isTarget ? '#6bcb77' : (isKorea ? '#ff6b6b' : (isInChain ? '#4d96ff' : '#3a3a5a'));
      const fillColor = isTarget ? '#0f2a0f' : (isKorea ? '#2a0e0e' : '#13132a');
      const strokeW = isTarget ? 2.5 : (isInChain ? 1.8 : 0.8);

      const g = nodeLayer.append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y + 20})`) // B: 아래서 시작
        .style('cursor', 'pointer')
        .style('opacity', 0);

      // B: 위로 올라오며 페이드인
      g.transition()
        .delay(activeChain ? animDelay : ni * 50)
        .duration(380)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('opacity', isInChain ? 1 : 0.28);

      g.append('rect')
        .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
        .attr('width', nodeW).attr('height', nodeH)
        .attr('rx', rx).attr('ry', rx)
        .attr('fill', fillColor)
        .attr('stroke', strokeColor)
        .attr('stroke-width', strokeW);

      // foreignObject로 노드 텍스트 렌더링 (자동 줄바꿈 지원)
      const { nodeW, nodeH, fs = 11 } = nodeSizes[node.id] || calcNodeSize(node.label, node.value);
      const isConcept = node.source === 'concept';

      // 가격 노드 value 파싱
      let dateStr = '', priceLine = '', pctPart = '', valueColor = '#52b788';
      if (node.value && !isConcept) {
        const hasArrow = node.value.indexOf('→') > -1;
        if (hasArrow) {
          const dateMatch = node.value.match(/\[(\d+\/\d+)\][^→]*→[^[]*\[(\d+\/\d+)\]/);
          if (dateMatch) dateStr = `${dateMatch[1]} → ${dateMatch[2]}`;
          const cleanValue = node.value.replace(/\[\d+\/\d+\]\s*/g, '');
          const cleanParen = cleanValue.lastIndexOf('(');
          priceLine = cleanParen > -1 ? cleanValue.slice(0, cleanParen).trim() : cleanValue;
          const parenIdx = node.value.lastIndexOf('(');
          pctPart = parenIdx > node.value.indexOf('→') ? node.value.slice(parenIdx).trim() : '';
          valueColor = pctPart.startsWith('(-') ? '#ff6060' : '#52b788';
        } else {
          priceLine = node.value;
        }
      }

      const labelColor  = isTarget ? '#6bcb77' : (isInChain ? '#f0f0ff' : '#888');
      const conceptValColor = isInChain ? '#9090c0' : '#5a5a7a';

      const fo = g.append('foreignObject')
        .attr('x', -nodeW / 2)
        .attr('y', -nodeH / 2)
        .attr('width', nodeW)
        .attr('height', nodeH);

      const div = fo.append('xhtml:div')
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('box-sizing', 'border-box')
        .style('padding', '4px 6px')
        .style('overflow', 'hidden')
        .style('text-align', 'center');

      // label
      div.append('xhtml:div')
        .style('font-size', `${fs}px`)
        .style('font-weight', '600')
        .style('color', labelColor)
        .style('word-break', 'keep-all')
        .style('overflow-wrap', 'break-word')
        .style('line-height', '1.35')
        .style('width', '100%')
        .text(node.label || '');

      // value
      if (node.value) {
        if (isConcept) {
          // 개념 노드: 자동 줄바꿈
          div.append('xhtml:div')
            .style('font-size', `${Math.max(8, fs - 2)}px`)
            .style('color', conceptValColor)
            .style('word-break', 'keep-all')
            .style('overflow-wrap', 'break-word')
            .style('line-height', '1.3')
            .style('margin-top', '3px')
            .style('width', '100%')
            .text(node.value);
        } else {
          // 가격 노드: 날짜 / 가격 / 변동률 분리
          if (dateStr) {
            div.append('xhtml:div')
              .style('font-size', `${Math.max(8, fs - 2)}px`)
              .style('color', '#ff4466')
              .style('line-height', '1.2')
              .style('margin-top', '2px')
              .text(dateStr);
          }
          if (priceLine) {
            div.append('xhtml:div')
              .style('font-size', `${Math.max(8, fs - 1)}px`)
              .style('color', isInChain ? '#b0b0cc' : '#666')
              .style('line-height', '1.2')
              .style('margin-top', '1px')
              .text(priceLine);
          }
          if (pctPart) {
            div.append('xhtml:div')
              .style('font-size', `${fs}px`)
              .style('font-weight', '700')
              .style('color', isTarget ? '#6bcb77' : (isInChain ? valueColor : '#888'))
              .style('line-height', '1.2')
              .style('margin-top', '1px')
              .text(pctPart);
          }
        }
      }

      // C: 노드 클릭 → 미니 차트
      g.on('click', function(event) {
        event.stopPropagation();
        setSelectedNode(node);
        if (onNodeClick) onNodeClick(node);

        // SVG 내 위치를 화면 좌표로 변환
        const svgRect = svgRef.current.getBoundingClientRect();
        const svgEl = d3.select(svgRef.current);
        const transform = d3.zoomTransform(svgRef.current);
        const screenX = transform.x + pos.x * transform.k + svgRect.left;
        const screenY = transform.y + pos.y * transform.k + svgRect.top;

        setMiniChartPos({ x: screenX, y: screenY });
        setMiniChartNode(prev => prev?.id === node.id ? null : node);
      });

      // hover: 확대 + 글로우
      g.on('mouseenter', function(event) {
        d3.select(this).select('rect')
          .transition().duration(150)
          .attr('x', -(nodeW / 2 + 3)).attr('y', -(nodeH / 2 + 3))
          .attr('width', nodeW + 6).attr('height', nodeH + 6)
          .attr('filter', 'url(#glow)');

        // 호버 툴팁: related_news 있는 개념 노드만 표시 (PC only)
        if (node.related_news && node.related_news.length > 0) {
          const svgRect = svgRef.current.getBoundingClientRect();
          const transform = d3.zoomTransform(svgRef.current);
          const screenX = transform.x + pos.x * transform.k + svgRect.left;
          const screenY = transform.y + pos.y * transform.k + svgRect.top;
          setHoveredNode(node);
          setHoverPos({ x: screenX, y: screenY });
        }

        // hover 시 연결 엣지 재펄스 (A)
        if (!activeChain) {
          const connectedEdges = edgeGroups.filter(
            eg => eg.edge.from === node.id || eg.edge.to === node.id
          );
          connectedEdges.forEach(({ src, tgt }) => {
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.max(20, Math.round(dist / 7));
            const stepDur = Math.round(600 / steps);
            const tailRatio = 0.18;

            const pulseLine = pulseLayer.append('line')
              .attr('stroke', '#a8d4ff')
              .attr('stroke-width', 2.5)
              .attr('stroke-linecap', 'round')
              .attr('filter', 'url(#glow)')
              .style('opacity', 0)
              .style('pointer-events', 'none');

            let step = 0;
            const animate = () => {
              const progress = step / steps;
              const tailStart = Math.max(0, progress - tailRatio);
              pulseLine
                .attr('x1', src.x + dx * tailStart)
                .attr('y1', src.y + dy * tailStart)
                .attr('x2', src.x + dx * Math.min(progress, 1))
                .attr('y2', src.y + dy * Math.min(progress, 1))
                .style('opacity',
                  progress < 0.08 ? progress / 0.08 * 0.85 :
                  progress > 0.88 ? (1 - progress) / 0.12 * 0.85 : 0.85
                );
              step++;
              if (step <= steps + 3) setTimeout(animate, stepDur);
              else pulseLine.remove();
            };
            animate();
          });
        }
      });

      g.on('mouseleave', function() {
        d3.select(this).select('rect')
          .transition().duration(150)
          .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
          .attr('width', nodeW).attr('height', nodeH)
          .attr('filter', null);
        setHoveredNode(null);
      });

      // activeEvent 타겟 노드 펄스
      if (isInChain && activeChain && isTarget) {
        const pulse = g.append('rect')
          .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
          .attr('width', nodeW).attr('height', nodeH)
          .attr('rx', rx).attr('ry', rx)
          .attr('fill', 'none')
          .attr('stroke', '#6bcb77')
          .attr('stroke-width', 1)
          .style('opacity', 0);

        const doPulse = () => {
          pulse
            .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
            .attr('width', nodeW).attr('height', nodeH)
            .style('opacity', 0.8)
            .transition().duration(900)
            .attr('x', -nodeW / 2 - 12).attr('y', -nodeH / 2 - 12)
            .attr('width', nodeW + 24).attr('height', nodeH + 24)
            .style('opacity', 0)
            .on('end', doPulse);
        };
        const tid = setTimeout(doPulse, animDelay + 300);
        pulseAnimsRef.current.push(tid);
      }
    });

    // ── missingHops: 미실현 파급 경로 점선 엣지 ──
    const missingLayer = zoomGroup.append('g').attr('class', 'missing-hop-layer');
    const missingHops = thread.missingHops || [];
    missingHops.forEach((hop, hi) => {
      // "to" 노드를 현재 노드 풀에서 찾기 (없으면 가상 위치)
      const sourceNode = nodes[nodes.length - 1]; // 마지막 노드에서 출발
      if (!sourceNode) return;
      const src = nodePos[sourceNode.id];
      if (!src) return;
      // 가상 목적지: 오른쪽 끝에 배치
      const vx = src.x + (nodeSizes[sourceNode.id]?.nodeW ?? 88) / 2 + 80;
      const vy = src.y + (hi - missingHops.length / 2) * 30;

      missingLayer.append('line')
        .attr('x1', src.x + (nodeSizes[sourceNode.id]?.nodeW ?? 88) / 2)
        .attr('y1', src.y)
        .attr('x2', vx)
        .attr('y2', vy)
        .attr('stroke', '#6366f1')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '5,4')
        .attr('stroke-opacity', 0)
        .attr('marker-end', 'url(#arrow-missing)')
        .transition().delay(hi * 80 + 600).duration(400)
        .attr('stroke-opacity', 0.55);

      // 레이블
      missingLayer.append('text')
        .attr('x', vx + 4)
        .attr('y', vy)
        .attr('font-size', '9px')
        .attr('fill', '#6366f1')
        .attr('dominant-baseline', 'middle')
        .style('opacity', 0)
        .text(`→ ${hop.to || ''}`)
        .transition().delay(hi * 80 + 700).duration(300)
        .style('opacity', 0.75);
    });

    // ── feedbackRisk: 피드백 루프 경고 배지 ──
    const fbRisk = thread.feedbackRisk;
    if (fbRisk?.hasFeedback && fbRisk.riskLevel === 'high') {
      // 첫 번째 노드에 경고 오버레이
      const firstNode = nodes[0];
      if (firstNode && nodePos[firstNode.id]) {
        const fp = nodePos[firstNode.id];
        const { nodeW, nodeH } = nodeSizes[firstNode.id] || { nodeW: 88, nodeH: 36 };
        nodeLayer.append('rect')
          .attr('x', fp.x - nodeW / 2 - 4)
          .attr('y', fp.y - nodeH / 2 - 4)
          .attr('width', nodeW + 8)
          .attr('height', nodeH + 8)
          .attr('rx', 12).attr('ry', 12)
          .attr('fill', 'none')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,2')
          .style('opacity', 0.6)
          .style('pointer-events', 'none');
        nodeLayer.append('text')
          .attr('x', fp.x + nodeW / 2 + 2)
          .attr('y', fp.y - nodeH / 2 - 2)
          .attr('font-size', '9px')
          .attr('fill', '#ef4444')
          .text('⟳ 피드백루프')
          .style('pointer-events', 'none');
      }
    }

    // bbox fit 적용 (노드 렌더 완료 후)
    applyInitialFit();
  };

  return (
    <div className="dag-graph">
      <div className="dag-header">
        <div className="dag-header-top">
          <span className="dag-title">{thread?.title}</span>
        </div>
        <span className="dag-briefing">{thread?.briefing}</span>

      {/* rootCause 표시 */}
      {thread?.rootCause?.trigger && (
        <div className="dag-rootcause-bar">
          <span className="dag-rootcause-icon">⚡</span>
          <span className="dag-rootcause-trigger">{thread.rootCause.trigger}</span>
          {thread.rootCause.why && (
            <span className="dag-rootcause-why">{thread.rootCause.why}</span>
          )}
        </div>
      )}

      {/* chainFragility 취약 링크 경고 */}
      {thread?.chainFragility?.fragileEdge && (
        <div className="dag-fragile-bar">
          <span className="dag-fragile-icon">⚠</span>
          <span className="dag-fragile-text">
            취약 링크: {thread.chainFragility.fragileEdge}
            {thread.chainFragility.fragileReason && ` — ${thread.chainFragility.fragileReason}`}
          </span>
        </div>
      )}

      {/* verification 배지 */}
      {thread?.verification?.overallVerdict && (() => {
        const cfg = {
          CONFIRMED:    { icon: '✅', color: '#22c55e', label: '예측 실현' },
          PARTIAL:      { icon: '⚠️', color: '#f59e0b', label: '부분 실현' },
          REVERSED:     { icon: '❌', color: '#ef4444', label: '예측 반전' },
          INCONCLUSIVE: { icon: '❓', color: '#6b7280', label: '판단 불가' },
        }[thread.verification.overallVerdict];
        return cfg ? (
          <span className="dag-verification-badge" style={{ color: cfg.color }}>
            {cfg.icon} {cfg.label}
            {thread.verification.daysLater && ` (D+${thread.verification.daysLater})`}
          </span>
        ) : null;
      })()}

      </div>

      {activeTimeEvent && (
        <div className="dag-active-event">
          <span className="dag-event-label">▶ {activeTimeEvent.label}</span>
          <span className="dag-event-source">{activeTimeEvent.source}</span>
          <button
            className="dag-reset-btn"
            onClick={() => {
              setSelectedNode(null);
              setMiniChartNode(null);
              if (onNodeClick) onNodeClick(null);
            }}
          >
            ↩ 전체 인과흐름 복귀
          </button>
        </div>
      )}

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />

        {/* 모바일 핀치 힌트 */}
        {showPinchHint && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 20,
          }}>
            <div style={{
              background: 'rgba(10,10,20,0.82)',
              borderRadius: 16, padding: '18px 28px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 10,
              animation: 'wmn-pinch 0.5s ease-in-out',
            }}>
              <div style={{ fontSize: 36, letterSpacing: 8 }}>🤏</div>
              <div style={{
                color: '#c8c8e0', fontSize: 13, fontWeight: 600,
                letterSpacing: 0.5, textAlign: 'center',
              }}>
                핀치로 확대 · 드래그로 이동
              </div>
            </div>
          </div>
        )}

        {/* C: 미니 차트 팝업 */}
        {miniChartNode && (
          <MiniChart
            node={miniChartNode}
            thread={thread}
            prices={prices}
            onClose={() => setMiniChartNode(null)}
          />
        )}

        {/* 호버 툴팁: related_news PC only */}
        {hoveredNode && !miniChartNode && hoveredNode.related_news?.length > 0 && (
          <div
            className="node-hover-tooltip"
            style={{
              position: 'fixed',
              left: hoverPos.x + 12,
              top: hoverPos.y - 8,
              pointerEvents: 'none',
              zIndex: 50,
            }}
          >
            {hoveredNode.related_news.map((news, i) => (
              <div key={i} className="node-hover-tooltip-item">
                {news.source && (
                  <span className="node-hover-tooltip-source">[{news.source}]</span>
                )}
                <span className="node-hover-tooltip-title">{news.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedNode && !miniChartNode && (
        <div className="node-infobar">
          <div className="node-infobar-left">
            <span className="node-infobar-label">{selectedNode.label}</span>
            {selectedNode.value && (
              <span className="node-infobar-value">{selectedNode.value}</span>
            )}
            {selectedNode.source && (
              <span className="node-infobar-source">📌 {selectedNode.source}</span>
            )}
            {selectedNode.timestamp &&
              selectedNode.timestamp !== 'current' &&
              selectedNode.timestamp !== '예상' && (
                <span className="node-infobar-time">{selectedNode.timestamp}</span>
              )}
          </div>
          <button className="node-infobar-close" onClick={() => setSelectedNode(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

export default DagGraph;