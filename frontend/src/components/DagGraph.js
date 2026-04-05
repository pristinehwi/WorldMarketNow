import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function DagGraph({ thread, activeTimeEvent, onNodeClick, onOpenPanel }) {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!thread || !svgRef.current) return;
    const observer = new ResizeObserver(() => {
      drawDAG(thread, activeTimeEvent);
    });
    observer.observe(svgRef.current.parentElement);
    drawDAG(thread, activeTimeEvent);
    return () => observer.disconnect();
  }, [thread, activeTimeEvent]);

  useEffect(() => {
    setSelectedNode(null);
  }, [thread]);

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

  const getOrderedChain = (chainSet, levels) => {
    return Array.from(chainSet).sort((a, b) => (levels[a] || 0) - (levels[b] || 0));
  };

  // 텍스트 너비 추정 (한글/영문 혼합 고려)
  const estimateTextWidth = (text, fontSize = 11) => {
    if (!text) return 0;
    let width = 0;
    for (const ch of text) {
      // 한글/CJK는 영문의 약 1.8배 너비
      if (ch.charCodeAt(0) > 127) {
        width += fontSize * 1.1;
      } else {
        width += fontSize * 0.6;
      }
    }
    return width;
  };

  // 노드 크기 계산 — value가 "기저→평가" 형식일 때 충분한 너비 확보
  const calcNodeSize = (label, value) => {
    const labelLines = (label || '').split(' ');
    const maxLabelW = Math.max(...labelLines.map(w => estimateTextWidth(w, 11)));

    // value가 "$106.81→$106.38 (-0.40%)" 같은 형식이면 더 넓게
    const valueW = value ? estimateTextWidth(value, 11) : 0;

    const nodeW = Math.max(90, maxLabelW + 24, valueW + 24);
    const nodeH = Math.max(50, labelLines.length * 16 + (value ? 22 : 6) + 16);

    return { nodeW, nodeH };
  };

  const drawDAG = (thread, activeEvent) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const nodes = thread.nodes || [];
    const edges = thread.edges || [];
    const levels = assignLevels(nodes, edges);
    const maxLevel = Math.max(...Object.values(levels), 0);

    // 노드 크기 미리 계산해서 캔버스 크기 결정
    const nodeSizes = {};
    nodes.forEach(n => {
      nodeSizes[n.id] = calcNodeSize(n.label, n.value);
    });
    const maxNodeW = Math.max(...Object.values(nodeSizes).map(s => s.nodeW));

    const CANVAS_W = Math.max(900, (maxLevel + 1) * (maxNodeW + 80) + 120);
    const CANVAS_H = 520;
    const PADDING_X = 80;
    const PADDING_Y = 60;

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      });

    svg.call(zoom);

    svg.on('click', (event) => {
      if (event.target === svgRef.current || event.target.tagName === 'svg') {
        setSelectedNode(null);
      }
    });

    let activeChain = null;
    let orderedChain = null;
    if (activeEvent) {
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

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 60).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#4d96ff');

    defs.append('marker')
      .attr('id', 'arrow-dim')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 60).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#2a2a3a');

    edges.forEach(edge => {
      const src = nodePos[edge.from];
      const tgt = nodePos[edge.to];
      if (!src || !tgt) return;
      const isActive = activeChain
        ? activeChain.has(edge.from) && activeChain.has(edge.to)
        : true;

      zoomGroup.append('line')
        .attr('x1', src.x).attr('y1', src.y)
        .attr('x2', tgt.x).attr('y2', tgt.y)
        .attr('stroke', isActive ? '#4d96ff' : '#1e1e2e')
        .attr('stroke-width', isActive ? 2 : 1)
        .attr('stroke-opacity', isActive ? 0.9 : 0.3)
        .attr('marker-end', isActive ? 'url(#arrow)' : 'url(#arrow-dim)');

      if (isActive && edge.label) {
        const mx = (src.x + tgt.x) / 2;
        const my = (src.y + tgt.y) / 2;
        zoomGroup.append('text')
          .attr('x', mx).attr('y', my - 6)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('fill', '#555')
          .text(edge.label);
      }
    });

    nodes.forEach(node => {
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

      const g = zoomGroup.append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('cursor', 'pointer')
        .style('opacity', isInChain ? (activeChain ? 0 : 1) : 0.1);

      g.append('rect')
        .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
        .attr('width', nodeW).attr('height', nodeH)
        .attr('rx', rx).attr('ry', rx)
        .attr('fill', fillColor)
        .attr('stroke', strokeColor)
        .attr('stroke-width', strokeW);

      const label = node.label || '';
      const words = label.split(' ');
      const lineHeight = 15;
      const totalTextH = words.length * lineHeight + (node.value ? 18 : 0);
      const startY = -(totalTextH / 2) + lineHeight / 2;

      words.forEach((word, i) => {
        g.append('text')
          .attr('y', startY + i * lineHeight)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '11px')
          .attr('fill', isTarget ? '#6bcb77' : (isInChain ? '#fff' : '#333'))
          .text(word);
      });

      if (node.value) {
        g.append('text')
          .attr('y', startY + words.length * lineHeight)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', isTarget ? '#6bcb77' : (isInChain ? '#4d96ff' : '#2a2a3a'))
          .text(node.value);
      }

      g.on('click', (event) => {
        event.stopPropagation();
        setSelectedNode(node);
        if (onNodeClick) onNodeClick(node);
      });

      g.on('mouseenter', function () {
        d3.select(this).select('rect')
          .transition().duration(150)
          .attr('x', -(nodeW / 2 + 4)).attr('y', -(nodeH / 2 + 4))
          .attr('width', nodeW + 8).attr('height', nodeH + 8);
      });
      g.on('mouseleave', function () {
        d3.select(this).select('rect')
          .transition().duration(150)
          .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
          .attr('width', nodeW).attr('height', nodeH);
      });

      if (isInChain && activeChain) {
        g.transition().delay(animDelay).duration(300).style('opacity', 1);

        if (isTarget) {
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
          setTimeout(doPulse, animDelay + 300);
        }
      }
    });
  };

  return (
    <div className="dag-graph">
      <div className="dag-header">
        <div className="dag-header-top">
          <span className="dag-title">{thread?.title}</span>
          {onOpenPanel && (
            <button className="dag-detail-btn" onClick={onOpenPanel}>
              📋 상세
            </button>
          )}
        </div>
        <span className="dag-briefing">{thread?.briefing}</span>
      </div>

      {activeTimeEvent && (
        <div className="dag-active-event">
          <span className="dag-event-label">▶ {activeTimeEvent.label}</span>
          <span className="dag-event-source">{activeTimeEvent.source}</span>
        </div>
      )}

      <svg ref={svgRef} style={{ width: '100%', flex: 1 }} />

      {selectedNode && (
        <div className="node-infobar">
          <div className="node-infobar-left">
            <span className="node-infobar-label">{selectedNode.label}</span>
            {selectedNode.value && (
              <span className="node-infobar-value">{selectedNode.value}</span>
            )}
            {selectedNode.source && (
              <span className="node-infobar-source">📌 {selectedNode.source}</span>
            )}
            {selectedNode.timestamp && selectedNode.timestamp !== 'current' && selectedNode.timestamp !== '예상' && (
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
