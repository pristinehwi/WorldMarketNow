import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function DagGraph({ thread, activeTimeEvent, onNodeClick, popupNode, setPopupNode }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!thread || !svgRef.current) return;
    const observer = new ResizeObserver(() => {
      drawDAG(thread, activeTimeEvent);
    });
    observer.observe(svgRef.current.parentElement);
    drawDAG(thread, activeTimeEvent);
    return () => observer.disconnect();
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

  const getOrderedChain = (chainSet, levels) => {
    return Array.from(chainSet).sort((a, b) => (levels[a] || 0) - (levels[b] || 0));
  };

  const drawDAG = (thread, activeEvent) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const nodes = thread.nodes || [];
    const edges = thread.edges || [];
    const levels = assignLevels(nodes, edges);
    const maxLevel = Math.max(...Object.values(levels), 0);

    const CANVAS_W = Math.max(800, (maxLevel + 1) * 160 + 120);
    const CANVAS_H = 500;
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
        setPopupNode(null);
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
      .attr('refX', 28).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#4d96ff');

    defs.append('marker')
      .attr('id', 'arrow-dim')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28).attr('refY', 0)
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

      const g = zoomGroup.append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('cursor', 'pointer')
        .style('opacity', isInChain ? (activeChain ? 0 : 1) : 0.1);

      g.append('circle')
        .attr('r', isKorea ? 36 : (isTarget ? 34 : 30))
        .attr('fill', isTarget ? '#0d1a0d' : (isKorea ? '#1a0a0a' : '#0d0d1e'))
        .attr('stroke', isTarget ? '#6bcb77' : (isKorea ? '#ff6b6b' : (isInChain ? '#4d96ff' : '#222')))
        .attr('stroke-width', isTarget ? 2.5 : (isInChain ? 1.5 : 0.5));

      const words = (node.label || '').split(' ');
      const lineHeight = 13;
      const startY = -(words.length - 1) * lineHeight / 2;
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
          .attr('font-size', '11px')
          .attr('fill', isTarget ? '#6bcb77' : (isInChain ? '#4d96ff' : '#2a2a3a'))
          .text(node.value);
      }

      g.append('title').text(`${node.label}\n출처: ${node.source || ''}`);

      g.on('click', (event) => {
        event.stopPropagation();
        const svgRect = svgRef.current.getBoundingClientRect();
        const containerRect = svgRef.current.parentElement.getBoundingClientRect();
        const scaleX = svgRect.width / CANVAS_W;
        const scaleY = svgRect.height / CANVAS_H;
        const px = (pos.x * scaleX) + (svgRect.left - containerRect.left);
        const py = (pos.y * scaleY) + (svgRect.top - containerRect.top);
        setPopupNode({ node, x: px, y: py });
        if (onNodeClick) onNodeClick(node);
      });

      g.on('mouseenter', function() {
        d3.select(this).select('circle')
          .transition().duration(150)
          .attr('r', isKorea ? 40 : (isTarget ? 38 : 34));
      });
      g.on('mouseleave', function() {
        d3.select(this).select('circle')
          .transition().duration(150)
          .attr('r', isKorea ? 36 : (isTarget ? 34 : 30));
      });

      if (isInChain && activeChain) {
        g.transition()
          .delay(animDelay)
          .duration(300)
          .style('opacity', 1);

        if (isTarget) {
          const pulse = g.append('circle')
            .attr('r', 36)
            .attr('fill', 'none')
            .attr('stroke', '#6bcb77')
            .attr('stroke-width', 1)
            .style('opacity', 0);

          const doPulse = () => {
            pulse
              .attr('r', 36)
              .style('opacity', 0.8)
              .transition().duration(900)
              .attr('r', 54)
              .style('opacity', 0)
              .on('end', doPulse);
          };
          setTimeout(doPulse, animDelay + 300);
        }
      }
    });
  };

  return (
    <div className="dag-graph" style={{ position: 'relative' }}>
      <div className="dag-header">
        <span className="dag-title">{thread?.title}</span>
        <span className="dag-briefing">{thread?.briefing}</span>
      </div>
      {activeTimeEvent && (
        <div className="dag-active-event">
          <span className="dag-event-label">▶ {activeTimeEvent.label}</span>
          <span className="dag-event-source">{activeTimeEvent.source}</span>
        </div>
      )}
      <svg ref={svgRef} style={{ width: '100%', flex: 1 }} />

      {popupNode && (
        <div
          className="node-popup"
          style={{
            position: 'absolute',
            left: popupNode.x + 40,
            top: popupNode.y - 20,
            zIndex: 50,
          }}
        >
          <div className="node-popup-label">{popupNode.node.label}</div>
          {popupNode.node.value && (
            <div className="node-popup-value">{popupNode.node.value}</div>
          )}
          {popupNode.node.source && (
            <div className="node-popup-source">📌 {popupNode.node.source}</div>
          )}
          {popupNode.node.timestamp && popupNode.node.timestamp !== 'current' && popupNode.node.timestamp !== '예상' && (
            <div className="node-popup-time">{popupNode.node.timestamp}</div>
          )}
          <button className="node-popup-close" onClick={() => setPopupNode(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

export default DagGraph;