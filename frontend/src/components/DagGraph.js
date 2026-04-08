import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

// ── 미니 차트 팝업 (C) ──────────────────────────────────────
function MiniChart({ node, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // candle 데이터가 있으면 sparkline, 없으면 value 텍스트만
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // value에서 기저/평가 파싱
    const value = node.value || '';
    const arrowIdx = value.indexOf('→');
    const parenIdx = value.lastIndexOf('(');

    let basePrice = null, currPrice = null, changePct = null;
    if (arrowIdx > -1) {
      const rawBase = value.slice(0, arrowIdx).replace(/[^0-9.]/g, '');
      const rawCurr = parenIdx > -1
        ? value.slice(arrowIdx + 1, parenIdx).replace(/[^0-9.]/g, '')
        : value.slice(arrowIdx + 1).replace(/[^0-9.]/g, '');
      const rawPct = parenIdx > -1 ? value.slice(parenIdx) : '';
      basePrice = parseFloat(rawBase);
      currPrice = parseFloat(rawCurr);
      const pctMatch = rawPct.match(/([-+]?[\d.]+)%/);
      changePct = pctMatch ? parseFloat(pctMatch[1]) : null;
    }

    const isUp = changePct === null ? null : changePct >= 0;
    const lineColor = isUp === null ? '#5b8dee' : (isUp ? '#52b788' : '#ff4d4d');
    const fillColor = isUp === null ? '#5b8dee18' : (isUp ? '#52b78818' : '#ff4d4d18');

    if (basePrice !== null && currPrice !== null && !isNaN(basePrice) && !isNaN(currPrice)) {
      // 간단한 선형 보간 sparkline (7포인트)
      const steps = 7;
      const prices = Array.from({ length: steps }, (_, i) => {
        const t = i / (steps - 1);
        // 약간의 노이즈 추가로 자연스럽게
        const noise = (Math.sin(i * 2.1) * 0.003 + Math.cos(i * 1.7) * 0.002);
        return basePrice + (currPrice - basePrice) * t + basePrice * noise;
      });

      const minP = Math.min(...prices) * 0.998;
      const maxP = Math.max(...prices) * 1.002;
      const range = maxP - minP || 1;

      const pad = 8;
      const toX = (i) => pad + (i / (steps - 1)) * (W - pad * 2);
      const toY = (p) => pad + (1 - (p - minP) / range) * (H - pad * 2);

      // fill
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(prices[0]));
      prices.forEach((p, i) => { if (i > 0) ctx.lineTo(toX(i), toY(p)); });
      ctx.lineTo(toX(steps - 1), H);
      ctx.lineTo(toX(0), H);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // line
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(prices[0]));
      prices.forEach((p, i) => { if (i > 0) ctx.lineTo(toX(i), toY(p)); });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 종가 dot
      ctx.beginPath();
      ctx.arc(toX(steps - 1), toY(prices[steps - 1]), 3, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
    } else {
      // 데이터 없을 때 중앙 텍스트
      ctx.font = '11px Inter';
      ctx.fillStyle = '#4a4a6a';
      ctx.textAlign = 'center';
      ctx.fillText('가격 데이터 없음', W / 2, H / 2);
    }
  }, [node]);

  const value = node.value || '';
  const arrowIdx = value.indexOf('→');
  const parenIdx = value.lastIndexOf('(');
  const changePart = parenIdx > -1 ? value.slice(parenIdx) : '';
  const pctMatch = changePart.match(/([-+]?[\d.]+)%/);
  const changePct = pctMatch ? parseFloat(pctMatch[1]) : null;
  const isUp = changePct === null ? null : changePct >= 0;

  return (
    <div className="mini-chart-popup" onClick={(e) => e.stopPropagation()}>
      <div className="mini-chart-header">
        <span className="mini-chart-label">{node.label}</span>
        {changePct !== null && (
          <span className="mini-chart-pct" style={{ color: isUp ? '#52b788' : '#ff4d4d' }}>
            {isUp ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        )}
        <button className="mini-chart-close" onClick={onClose}>✕</button>
      </div>
      {value && (
        <div className="mini-chart-value">{value}</div>
      )}
      <canvas
        ref={canvasRef}
        width={220}
        height={80}
        className="mini-chart-canvas"
      />
      {node.source && (
        <div className="mini-chart-source">📌 {node.source}</div>
      )}
    </div>
  );
}

// ── DAG 메인 ────────────────────────────────────────────────
function DagGraph({ thread, activeTimeEvent, onNodeClick, onOpenPanel }) {
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

  const estimateTextWidth = (text, fontSize = 11) => {
    if (!text) return 0;
    let width = 0;
    for (const ch of text) {
      width += ch.charCodeAt(0) > 127 ? fontSize * 1.1 : fontSize * 0.6;
    }
    return width;
  };

  const calcNodeSize = (label, value, scale = 1.0) => {
    const fs = Math.round(11 * scale);
    const labelLines = (label || '').split(' ');
    const maxLabelW = Math.max(...labelLines.map(w => estimateTextWidth(w, fs)));
    let valueW = 0, valueLines = 1;
    if (value) {
      const arrowIdx = value.indexOf('→');
      if (arrowIdx > -1) {
        const parenIdx = value.lastIndexOf('(');
        const line1 = parenIdx > -1 ? value.slice(0, parenIdx).trim() : value;
        const line2 = parenIdx > -1 ? value.slice(parenIdx).trim() : '';
        valueW = Math.max(estimateTextWidth(line1, fs - 1), estimateTextWidth(line2, fs - 1));
        valueLines = line2 ? 2 : 1;
      } else {
        valueW = estimateTextWidth(value, fs - 1);
      }
    }
    const pad = Math.round(20 * scale);
    const nodeW = Math.max(Math.round(88 * scale), maxLabelW + pad, valueW + pad);
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
    // 기준: 5노드 이하 → scale 1.4, 8노드 → 1.15, 12노드 이상 → 1.0
    const autoScale = nodeCount <= 4 ? 1.5
      : nodeCount <= 6 ? 1.3
      : nodeCount <= 8 ? 1.15
      : nodeCount <= 10 ? 1.05
      : 1.0;

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
      const totalTextH = words.length * lineHeight + (node.value ? Math.round(18 * sc) : 0);
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
        const hasArrow = arrowIdx > -1 && parenIdx > -1;

        if (hasArrow) {
          const line1 = node.value.slice(0, parenIdx).trim();
          const line2 = node.value.slice(parenIdx).trim();
          const valueColor = line2.startsWith('(-') ? '#ff6060' : '#52b788';

          g.append('text')
            .attr('y', startY + words.length * lineHeight)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${Math.round((fs - 2) * sc)}px`)
            .attr('fill', isInChain ? '#b0b0cc' : '#2a2a3a')
            .text(line1);

          g.append('text')
            .attr('y', startY + words.length * lineHeight + Math.round(13 * sc))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${Math.round((fs - 1) * sc)}px`)
            .attr('font-weight', '700')
            .attr('fill', isTarget ? '#6bcb77' : (isInChain ? valueColor : '#2a2a3a'))
            .text(line2);
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
        </div>
      )}

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />

        {/* C: 미니 차트 팝업 */}
        {miniChartNode && (
          <MiniChart
            node={miniChartNode}
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
