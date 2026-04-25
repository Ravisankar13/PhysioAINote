import { useState, useMemo } from 'react';
import type { FlowGraph, FlowEdge, FlowNode } from '@/lib/slingDriverAnalysis';

interface SlingLoadFlowMapProps {
  graph: FlowGraph;
}

const EDGE_COLORS: Record<FlowEdge['quality'], string> = {
  intended: '#10b981', // green
  overloaded: '#ef4444', // red
  rerouted: '#f59e0b', // orange/amber
};

function nodeCoords(graph: FlowGraph, nodeId: string): { x: number; y: number } {
  const n = graph.nodes.find(n => n.id === nodeId);
  return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
}

export default function SlingLoadFlowMap({ graph }: SlingLoadFlowMapProps) {
  const [view, setView] = useState<'actual' | 'intended' | 'both'>('actual');
  const [popoverNode, setPopoverNode] = useState<FlowNode | null>(null);

  const W = 320;
  const H = 130;

  const edgesToDraw = useMemo<FlowEdge[]>(() => {
    if (view === 'intended') return graph.intendedEdges;
    if (view === 'actual') return graph.actualEdges;
    // both — render intended underneath, then actual
    return [...graph.intendedEdges, ...graph.actualEdges];
  }, [graph, view]);

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-2.5 space-y-2" data-testid="sling-load-flow-map">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: graph.color }}
        />
        <span className="text-[10px] font-medium text-slate-300 flex-1">
          Load Flow · {graph.slingLabel}
        </span>
        <div className="flex items-center gap-0.5 rounded border border-slate-700/40 overflow-hidden bg-slate-900/60">
          {(['actual', 'intended', 'both'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`text-[8px] px-1.5 py-0.5 capitalize transition-colors ${
                view === v
                  ? 'bg-cyan-500/30 text-cyan-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
              data-testid={`flow-view-${v}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Force flow map for ${graph.slingLabel}`}
        >
          {/* Edges */}
          {edgesToDraw.map((edge, i) => {
            const a = nodeCoords(graph, edge.from);
            const b = nodeCoords(graph, edge.to);
            const stroke = EDGE_COLORS[edge.quality];
            const isOverlay = view === 'both' && edge.quality === 'intended';
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const ctrlX = a.x + dx / 2;
            const ctrlY = a.y + dy / 2 - (edge.quality === 'rerouted' ? 22 : 0);
            const path = edge.quality === 'rerouted'
              ? `M${a.x},${a.y} Q${ctrlX},${ctrlY} ${b.x},${b.y}`
              : `M${a.x},${a.y} L${b.x},${b.y}`;
            return (
              <g key={`edge-${i}`} opacity={isOverlay ? 0.35 : 1}>
                <path
                  d={path}
                  stroke={stroke}
                  strokeWidth={edge.quality === 'overloaded' ? 3 : 2}
                  strokeDasharray={edge.quality === 'rerouted' ? '4 3' : undefined}
                  fill="none"
                  markerEnd={`url(#arrow-${edge.quality})`}
                />
                {edge.caption && view !== 'intended' && (
                  <text
                    x={ctrlX}
                    y={ctrlY - 3}
                    textAnchor="middle"
                    fontSize="7"
                    fill={stroke}
                    style={{ pointerEvents: 'none' }}
                  >
                    {edge.caption}
                  </text>
                )}
              </g>
            );
          })}

          {/* Arrow markers */}
          <defs>
            {(['intended', 'overloaded', 'rerouted'] as const).map(q => (
              <marker
                key={q}
                id={`arrow-${q}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={EDGE_COLORS[q]} />
              </marker>
            ))}
          </defs>

          {/* Nodes */}
          {graph.nodes.map(node => {
            const isHot = node.pinned || node.overloaded;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverNode(p => (p?.id === node.id ? null : node));
                }}
                style={{ cursor: 'pointer' }}
                data-testid={`flow-node-${node.id}`}
              >
                <circle
                  r={isHot ? 8 : 6}
                  fill={isHot ? '#ef4444' : node.compensating ? '#f59e0b' : '#0f172a'}
                  stroke={isHot ? '#fecaca' : graph.color}
                  strokeWidth={isHot ? 2 : 1.5}
                />
                {node.pinned && (
                  <circle
                    r={11}
                    fill="none"
                    stroke="#ef4444"
                    strokeOpacity={0.55}
                    strokeWidth={1}
                  />
                )}
                <text
                  y={-12}
                  textAnchor="middle"
                  fontSize="7.5"
                  fill={isHot ? '#fecaca' : '#cbd5e1'}
                  fontWeight={isHot ? 700 : 500}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {popoverNode && (
          <div
            className="absolute top-1 right-1 max-w-[200px] rounded border border-slate-600/70 bg-slate-800/95 p-2 shadow-lg text-[9px] text-slate-200 space-y-1"
            onClick={(e) => e.stopPropagation()}
            data-testid="flow-node-popover"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-cyan-300">{popoverNode.label}</span>
              <button
                type="button"
                onClick={() => setPopoverNode(null)}
                className="text-slate-500 hover:text-slate-200 text-[10px] leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {popoverNode.pinned && (
              <div className="text-red-300">Pain marker pinned to this node.</div>
            )}
            {popoverNode.overloaded && (
              <div className="text-red-200">Forward engine flags this segment as overloaded.</div>
            )}
            {popoverNode.compensating && (
              <div className="text-amber-300">This node is acting as a force compensator.</div>
            )}
            {!popoverNode.pinned && !popoverNode.overloaded && !popoverNode.compensating && (
              <div className="text-slate-400">No active load anomaly here in this analysis.</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-[8px] text-slate-400 pt-1 border-t border-slate-700/30">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ backgroundColor: EDGE_COLORS.intended }} />
          Intended
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ backgroundColor: EDGE_COLORS.overloaded }} />
          Overload
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 border-t border-dashed" style={{ borderColor: EDGE_COLORS.rerouted }} />
          Reroute
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          Pain pin
        </span>
      </div>
    </div>
  );
}
