import React from 'react';

function SidePanel({ thread, onClose }) {
  if (!thread) return null;

  const frequencyColor = (freq) => {
    switch(freq) {
      case 'OVERNIGHT': return '#ff6b6b';
      case 'WEEKLY':    return '#ffd93d';
      case 'MONTHLY':   return '#6bcb77';
      default:          return '#4d96ff';
    }
  };

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <div className="side-panel-title">
          <span className="freq-badge"
            style={{ background: frequencyColor(thread.frequency) }}>
            {thread.frequency}
          </span>
          <span>{thread.title}</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* 브리핑 */}
      <div className="side-panel-briefing">
        {thread.briefing}
      </div>

      {/* 노드 목록 */}
      <div className="side-panel-section">
        <div className="section-title">인과 노드</div>
        {thread.nodes?.map(node => (
          <div key={node.id} className="node-item">
            <div className="node-label">{node.label}</div>
            {node.value && (
              <div className="node-value">{node.value}</div>
            )}
            <div className="node-source">
              📌 {node.source}
              {node.timestamp && node.timestamp !== 'current' && node.timestamp !== '예상' && (
                <span className="node-time"> · {node.timestamp}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 엣지 목록 */}
      <div className="side-panel-section">
        <div className="section-title">인과 연결</div>
        {thread.edges?.map((edge, i) => {
          const fromNode = thread.nodes?.find(n => n.id === edge.from);
          const toNode = thread.nodes?.find(n => n.id === edge.to);
          return (
            <div key={i} className="edge-item">
              <span className="edge-from">{fromNode?.label}</span>
              <span className="edge-arrow"> → </span>
              <span className="edge-to">{toNode?.label}</span>
              {edge.label && (
                <span className="edge-label"> ({edge.label})</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 한국 종착 노드 */}
      {thread.korea_terminal_node && (
        <div className="korea-terminal">
          <div className="section-title">🇰🇷 한국 파급경로</div>
          <div className="korea-node">
            {thread.nodes?.find(n => n.id === thread.korea_terminal_node)?.label}
          </div>
        </div>
      )}
    </div>
  );
}

export default SidePanel;