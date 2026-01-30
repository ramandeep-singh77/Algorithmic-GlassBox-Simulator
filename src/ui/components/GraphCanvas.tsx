import React, { useMemo } from "react";
import type { Coord, DrawMode, Graph, StepSnapshot } from "../../core/types";

type Props = Readonly<{
  graph: Graph;
  startKey: string;
  goalKey: string;
  step: StepSnapshot | null;
  drawMode: DrawMode;
  onEdit: (edit: { kind: "start"; key: string } | { kind: "goal"; key: string }) => void;
  explanationPoints?: ReadonlyArray<{ at: Coord; text: string }>;
}>;

function getCSSVar(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v.trim() || "#ffffff";
}

export function GraphCanvas({ graph, startKey, goalKey, step, drawMode, onEdit, explanationPoints = [] }: Props) {
  const nodeAt = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n.at] as const)), [graph.nodes]);

  const bounds = useMemo(() => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const n of graph.nodes) {
      minX = Math.min(minX, n.at.x);
      minY = Math.min(minY, n.at.y);
      maxX = Math.max(maxX, n.at.x);
      maxY = Math.max(maxY, n.at.y);
    }
    if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    return { minX, minY, maxX, maxY };
  }, [graph.nodes]);

  const viewBox = useMemo(() => {
    const pad = 12;
    const w = Math.max(1, bounds.maxX - bounds.minX);
    const h = Math.max(1, bounds.maxY - bounds.minY);
    return `${bounds.minX - pad} ${bounds.minY - pad} ${w + pad * 2} ${h + pad * 2}`;
  }, [bounds]);

  const colors = useMemo(() => {
    return {
      line: "rgba(255,255,255,0.25)",
      linePath: getCSSVar("--cellPath"),
      node: "rgba(255,255,255,0.4)",
      visited: getCSSVar("--cellVisited"),
      frontier: getCSSVar("--cellFrontier"),
      current: getCSSVar("--cellCurrent"),
      path: getCSSVar("--cellPath"),
      good: getCSSVar("--good"),
      bad: getCSSVar("--bad")
    };
  }, []);

  const visited = step?.visited ?? new Set<string>();
  const closed = step?.closed ?? new Set<string>();
  const frontierKeys = useMemo(() => new Set(step?.frontier?.map((f) => f.key) ?? []), [step]);
  const currentKey = step?.currentKey ?? null;

  const pathCoordSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of step?.path ?? []) s.add(`${c.x},${c.y}`);
    return s;
  }, [step]);

  const onNodeClick = (id: string) => {
    if (drawMode === "start") onEdit({ kind: "start", key: id });
    else if (drawMode === "goal") onEdit({ kind: "goal", key: id });
  };

  return (
    <div>
      <div className="controlsRow" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <span className="small">
          Click nodes to set Start/Goal, then run and step through.
        </span>
        <span className="pill">
          <span className="mono">Mode</span>
          <span className="mono">{drawMode}</span>
        </span>
      </div>
      <div style={{ width: "100%", overflow: "auto" }}>
        <svg
          viewBox={viewBox}
          style={{
            width: "100%",
            minWidth: 360,
            height: "min(520px, 60vh)",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.05)",
            display: "block"
          }}
        >
          {/* edges */}
          {graph.edges.map((e, idx) => {
            const a = nodeAt.get(e.from);
            const b = nodeAt.get(e.to);
            if (!a || !b) return null;
            // Only draw each undirected edge once if data contains both directions.
            if (graph.directed && e.from > e.to) return null;
            // Thinner edges for large graphs but still visible
            const nodeCount = graph.nodes.length;
            const edgeWidth = nodeCount > 50 ? 1 : nodeCount > 20 ? 1.2 : 2;
            return (
              <line
                key={idx}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={colors.line}
                strokeWidth={edgeWidth}
              />
            );
          })}

          {/* nodes */}
          {graph.nodes.map((n) => {
            const k = n.id;
            let fill = colors.node;
            if (visited.has(k)) fill = colors.visited;
            if (frontierKeys.has(k)) fill = colors.frontier;
            if (pathCoordSet.has(`${n.at.x},${n.at.y}`)) fill = colors.path;
            if (closed.has(k)) fill = fill;
            if (currentKey === k) fill = colors.current;
            if (k === startKey) fill = colors.good;
            if (k === goalKey) fill = colors.bad;

            const stroke = k === startKey || k === goalKey ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)";
            const label = n.label ?? n.id;

            // Scale node size based on graph size - smaller for large graphs but still visible
            const nodeCount = graph.nodes.length;
            const nodeRadius = nodeCount > 50 ? 3.5 : nodeCount > 20 ? 4.5 : 5.5;
            const strokeWidth = nodeCount > 50 ? 1.3 : nodeCount > 20 ? 1.4 : 1.5;
            const fontSize = nodeCount > 50 ? 7 : nodeCount > 20 ? 8 : 9;
            const labelOffset = nodeCount > 50 ? 5 : nodeCount > 20 ? 6 : 9;
            
            // Only show labels for important nodes (start, goal, or nodes with custom labels) in large graphs
            const showLabel = nodeCount <= 50 || k === startKey || k === goalKey || n.label !== n.id || n.explanation;
            
            return (
              <g key={n.id} onClick={() => onNodeClick(n.id)} style={{ cursor: drawMode === "start" || drawMode === "goal" ? "pointer" : "default" }}>
                <circle cx={n.at.x} cy={n.at.y} r={nodeRadius} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                {showLabel && (
                  <text
                    x={n.at.x + labelOffset}
                    y={n.at.y + 3}
                    fontSize={fontSize}
                    fill="rgba(255,255,255,0.85)"
                    style={{ userSelect: "none" }}
                  >
                    {label}
                  </text>
                )}
                {n.explanation && (
                  <text
                    x={n.at.x}
                    y={n.at.y - 12}
                    fontSize={8}
                    fill="rgba(255,212,59,0.9)"
                    style={{ userSelect: "none", fontWeight: 600 }}
                  >
                    {n.explanation}
                  </text>
                )}
              </g>
            );
          })}

          {/* Explanation Points */}
          {explanationPoints.map((p, idx) => (
            <g key={`expl-${idx}`}>
              <circle
                cx={p.at.x}
                cy={p.at.y}
                r={4}
                fill="rgba(255,212,59,0.6)"
                stroke="rgba(255,212,59,0.9)"
                strokeWidth={1.5}
              />
              <text
                x={p.at.x + 8}
                y={p.at.y + 4}
                fontSize={9}
                fill="rgba(255,212,59,0.95)"
                style={{ userSelect: "none", fontWeight: 500 }}
              >
                {p.text}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

