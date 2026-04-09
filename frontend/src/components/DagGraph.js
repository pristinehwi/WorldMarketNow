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

  // 노드 ticker 추출 (label 괄호 안)
  const tickerMatch = (node.label || '').match(/\(([A-Z^0-9]+)\)/);
  const nodeTicker = tickerMatch ? tickerMatch[1] : null;

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
        ctx.fillText('···', cx, zeroY + 4);
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
function DagGraph({ thread, activeTimeEvent, prices, onNodeClick, onOpenPanel }) {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [miniChartNode, setMiniChartNode] = useState(null);
  const [miniChartPos, setMiniChartPos] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef(null);
  const pulseAnimsRef = useRef([]);

  // 스레드 전환 시 미니차트 닫기
  useEffect(() => {
    setSelectedNode(null);
    setMiniChartNode(null);
  }, [thread]);

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
      width += ch.charCodeAt(0) > 127 ? fontSize * 1.2 : fontSize * 0.7;
    }
    return width;
  };

  const calcNodeSize = (label, value, scale = 1.0) => {
    const fs = Math.round(10 * scale);
    const labelLines = (label || '').split(' ');
    const maxLabelW = Math.max(...labelLines.map(w => estimateTextWidth(w, fs)));
    let valueW = 0, valueLines = 1;
    if (value) {
      const arrowIdx = value.indexOf('→');
      const parenIdx = value.lastIndexOf('(');
      if (arrowIdx > -1) {
        // 날짜 제거 후 가격만으로 너비 계산
        const cleanValue = value.replace(/\[\d+\/\d+\]\s*/g, '');
        const cleanParen = cleanValue.lastIndexOf('(');
        const priceLine = cleanParen > -1 ? cleanValue.slice(0, cleanParen).trim() : cleanValue;
        const pctPart = parenIdx > arrowIdx ? value.slice(parenIdx).trim() : '';
        valueW = Math.max(
          estimateTextWidth(priceLine, fs - 1),
          estimateTextWidth(pctPart, fs)
        );
        valueLines = pctPart ? 3 : 2; // 날짜줄 + 가격줄 + 변동률줄
      } else {
        valueW = estimateTextWidth(value, fs - 1);
        if (valueW > 180) { valueW = 180; valueLines = Math.ceil(valueW / 160); }
      }
    }
    const pad = Math.round(40 * scale);
    const nodeW = Math.max(Math.round(120 * scale), maxLabelW + pad, valueW + pad);
    const nodeH = Math.max(Math.round(46 * scale), labelLines.length * Math.round(15 * scale) + valueLines * Math.round(14 * scale) + Math.round(16 * scale));
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
    const autoScale = nodeCount <= 4 ? 1.3
      : nodeCount <= 6 ? 1.15
      : nodeCount <= 8 ? 1.05
      : nodeCount <= 10 ? 0.97
      : 0.90;

    const nodeSizes = {};
    nodes.forEach(n => { nodeSizes[n.id] = calcNodeSize(n.label, n.value, autoScale); });
    const maxNodeW = Math.max(...Object.values(nodeSizes).map(s => s.nodeW));

    const minNeededW = (maxLevel + 1) * (maxNodeW + 60) + 80;
    const CANVAS_W = Math.max(containerW, minNeededW);
    const CANVAS_H = Math.max(containerH, 420);
    const PADDING_X = maxNodeW / 2 + 20;
    const PADDING_Y = 50;

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => zoomGroup.attr('transform', event.transform));
    svg.call(zoom);

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

    // ── edges 그리기 ──
    const edgeGroups = []; // 펄스 대상: 화면에 보이는 모든 edge
    edges.forEach((edge, ei) => {
      const src = nodePos[edge.from];
      const tgt = nodePos[edge.to];
      if (!src || !tgt) return;
      const isActive = activeChain
        ? activeChain.has(edge.from) && activeChain.has(edge.to)
        : true;

      const lineEl = edgeLayer.append('line')
        .attr('x1', src.x + (nodeSizes[edge.from]?.nodeW ?? 88) / 2)
        .attr('y1', src.y)
        .attr('x2', tgt.x - (nodeSizes[edge.to]?.nodeW ?? 88) / 2)
        .attr('y2', tgt.y)
        .attr('stroke', isActive ? '#4d96ff' : '#1e1e2e')
        .attr('stroke-width', isActive ? 1.8 : 1)
        .attr('stroke-opacity', 0)
        .attr('marker-end', isActive ? 'url(#arrow)' : 'url(#arrow-dim)');

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
          .attr('fill', isActive ? '#d8d8ff' : '#3a3a5a')
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

      const strokeColor = isTarget ? '#6bcb77' : (isKorea ? '#ff6b6b' : (isInChain ? '#4d96ff' : '#222'));
      const fillColor = isTarget ? '#0d1a0d' : (isKorea ? '#1a0a0a' : '#0d0d1e');
      const strokeW = isTarget ? 2.5 : (isInChain ? 1.5 : 0.5);

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
        .style('opacity', isInChain ? 1 : 0.12);

      g.append('rect')
        .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
        .attr('width', nodeW).attr('height', nodeH)
        .attr('rx', rx).attr('ry', rx)
        .attr('fill', fillColor)
        .attr('stroke', strokeColor)
        .attr('stroke-width', strokeW);

      const label = node.label || '';
      const words = label.split(' ');
      const { fs = 11, scale: sc = 1.0 } = nodeSizes[node.id] || {};
      const lineHeight = Math.round(15 * sc);

      // value 줄 수 미리 계산
      let valueLineCount = 0;
      if (node.value) {
        const hasArrow = node.value.indexOf('→') > -1;
        const hasParen = node.value.lastIndexOf('(') > node.value.indexOf('→');
        const hasDate = /\[\d+\/\d+\]/.test(node.value);
        if (hasArrow) {
          valueLineCount = (hasDate ? 1 : 0) + 1 + (hasParen ? 1 : 0);
        } else {
          valueLineCount = 1;
        }
      }
      const valueLH = Math.round(13 * sc);
      const totalTextH = words.length * lineHeight + valueLineCount * valueLH;
      const startY = -(totalTextH / 2) + lineHeight / 2;

      words.forEach((word, i) => {
        g.append('text')
          .attr('y', startY + i * lineHeight)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', `${fs}px`)
          .attr('fill', isTarget ? '#6bcb77' : (isInChain ? '#e8e8f8' : '#333'))
          .text(word);
      });

      if (node.value) {
        const arrowIdx = node.value.indexOf('→');
        const parenIdx = node.value.lastIndexOf('(');
        const hasArrow = arrowIdx > -1;
        const hasParen = parenIdx > -1 && parenIdx > arrowIdx;

        if (hasArrow) {
          // 날짜 파싱: [4/8] $127.19→[4/9] $140.07 (+10.13%)
          const dateMatch = node.value.match(/\[(\d+\/\d+)\][^→]*→[^[]*\[(\d+\/\d+)\]/);
          const baseDate = dateMatch ? dateMatch[1] : null;
          const currDate = dateMatch ? dateMatch[2] : null;

          // 가격만 추출 (날짜 제거)
          const cleanValue = node.value.replace(/\[\d+\/\d+\]\s*/g, '');
          const cleanArrow = cleanValue.indexOf('→');
          const cleanParen = cleanValue.lastIndexOf('(');
          const priceLine = cleanParen > -1 ? cleanValue.slice(0, cleanParen).trim() : cleanValue.slice(0, cleanArrow > -1 ? undefined : undefined).trim();
          const pctPart = hasParen ? node.value.slice(parenIdx).trim() : '';
          const vfs = Math.round((fs - 1) * sc);
          const vLineH = Math.round(13 * sc);
          const dateLineH = (baseDate && currDate) ? vLineH : 0;
          const labelEndY = startY + (words.length - 1) * lineHeight + lineHeight / 2;

          const valueColor = pctPart.startsWith('(-') ? '#ff6060' : '#52b788';

          // 날짜 표시 (형광빨강)
          if (baseDate && currDate) {
            g.append('text')
              .attr('y', labelEndY + vLineH * 0.6)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('font-size', `${Math.round((fs - 2) * sc)}px`)
              .attr('fill', '#ff4466')
              .text(`${baseDate} → ${currDate}`);
          }

          // 가격 한 줄
          g.append('text')
            .attr('y', labelEndY + vLineH * 0.6 + dateLineH)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${vfs}px`)
            .attr('fill', isInChain ? '#b0b0cc' : '#2a2a3a')
            .text(priceLine);

          // 변동률
          if (pctPart) {
            g.append('text')
              .attr('y', labelEndY + vLineH * 0.6 + dateLineH + vLineH)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('font-size', `${Math.round(fs * sc)}px`)
              .attr('font-weight', '700')
              .attr('fill', isTarget ? '#6bcb77' : (isInChain ? valueColor : '#2a2a3a'))
              .text(pctPart);
          }
        } else {
          const valueColor = node.value.startsWith('-') ? '#ff6060' : '#52b788';
          g.append('text')
            .attr('y', startY + words.length * lineHeight)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${Math.round((fs - 1) * sc)}px`)
            .attr('font-weight', '700')
            .attr('fill', isTarget ? '#6bcb77' : (isInChain ? valueColor : '#2a2a3a'))
            .text(node.value);
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
      g.on('mouseenter', function() {
        d3.select(this).select('rect')
          .transition().duration(150)
          .attr('x', -(nodeW / 2 + 3)).attr('y', -(nodeH / 2 + 3))
          .attr('width', nodeW + 6).attr('height', nodeH + 6)
          .attr('filter', 'url(#glow)');

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
  };

  return (
    <div className="dag-graph">
      <div className="dag-header">
        <div className="dag-header-top">
          <span className="dag-title">{thread?.title}</span>
        </div>
        <span className="dag-briefing">{thread?.briefing}</span>
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

        {/* C: 미니 차트 팝업 */}
        {miniChartNode && (
          <MiniChart
            node={miniChartNode}
            thread={thread}
            prices={prices}
            onClose={() => setMiniChartNode(null)}
          />
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
