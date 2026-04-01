import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function DagGraph({ thread, activeTimeEvent }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!thread || !svgRef.current) return;
    const timer = setTimeout(() => {
      drawDAG(thread, activeTimeEvent);
    }, 100);
    return () => clearTimeout(timer);
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

  const getActiveNodes = (nodes, activeEvent) => {
    return nodes.map(n => n.id);
  };

  const drawDAG = (thread, activeEvent) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svgRef.current.parentElement;
    const width = container.clientWidth || 700;
    const height = container.clientHeight || 450;

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const nodes = thread.nodes || [];
    const edges = thread.edges || [];
    const activeNodeIds = activeEvent
      ? getActiveNodes(nodes, activeEvent)
      : nodes.map(n => n.id);

    const levels = assignLevels(nodes, edges);
    const maxLevel = Math.max(...Object.values(levels), 0);

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
      const x = (lv + 1) * (width / (maxLevel + 2));
      const y = (levelCounter[lv] + 1) * (height / (count + 1));
      nodePos[n.id] = { x, y };
      levelCounter[lv]++;
    });

    // 화살표 마커
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#4d96ff');

    // 엣지
    edges.forEach(edge => {
      const src = nodePos[edge.from];
      const tgt = nodePos[edge.to];
      if (!src || !tgt) return;
      const isActive = activeNodeIds.includes(edge.from) && activeNodeIds.includes(edge.to);

      svg.append('line')
        .attr('x1', src.x).attr('y1', src.y)
        .attr('x2', tgt.x).attr('y2', tgt.y)
        .attr('stroke', isActive ? '#4d96ff' : '#333')
        .attr('stroke-width', isActive ? 2 : 1)
        .attr('stroke-opacity', isActive ? 1 : 0.3)
        .attr('marker-end', 'url(#arrow)');

      const mx = (src.x + tgt.x) / 2;
      const my = (src.y + tgt.y) / 2;
      svg.append('text')
        .attr('x', mx).attr('y', my - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', isActive ? '#aaa' : '#555')
        .text(edge.label || '');
    });

    // 노드
    nodes.forEach(node => {
      const pos = nodePos[node.id];
      if (!pos) return;
      const isActive = activeNodeIds.includes(node.id);
      const isKorea = node.id === thread.korea_terminal_node;

      const g = svg.append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('cursor', 'pointer');

      g.append('circle')
        .attr('r', isKorea ? 36 : 30)
        .attr('fill', isKorea ? '#ff6b6b22' : '#1a1a2e')
        .attr('stroke', isKorea ? '#ff6b6b' : (isActive ? '#4d96ff' : '#333'))
        .attr('stroke-width', isActive ? 2 : 1)
        .attr('opacity', isActive ? 1 : 0.35);

      const words = node.label.split(' ');
      const lineHeight = 13;
      const startY = -(words.length - 1) * lineHeight / 2;
      words.forEach((word, i) => {
        g.append('text')
          .attr('y', startY + i * lineHeight)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10px')
          .attr('fill', isActive ? '#fff' : '#555')
          .text(word);
      });

      if (node.value) {
        g.append('text')
          .attr('y', startY + words.length * lineHeight)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10px')
          .attr('fill', isActive ? '#4d96ff' : '#444')
          .text(node.value);
      }

      g.append('title').text(`${node.label}\n출처: ${node.source}`);
    });
  };

  return (
    <div className="dag-graph">
      <div className="dag-header">
        <span className="dag-title">{thread?.title}</span>
        <span className="dag-briefing">{thread?.briefing}</span>
      </div>
      <svg ref={svgRef} style={{ width: '100%', flex: 1 }} />
    </div>
  );
}

export default DagGraph;