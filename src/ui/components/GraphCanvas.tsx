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
    const pad = 15; // Increased padding
    const w = Math.max(1, bounds.maxX - bounds.minX);
    const h = Math.max(1, bounds.maxY - bounds.minY);
    return `${bounds.minX - pad} ${bounds.minY - pad} ${w + pad * 2} ${h + pad * 2}`;
  }, [bounds]);

  const colors = useMemo(() => {
    return {
      line: "rgba(255,255,255,0.25)", // Subtle edges
      linePath: getCSSVar("--cellPath"),
      node: "rgba(255,255,255,0.5)", // Default nodes - subtle
      visited: "rgba(124, 92, 255, 0.9)", // Strong purple for visited
      frontier: "rgba(255, 165, 0, 0.9)", // Strong orange for frontier
      current: "rgba(50, 205, 50, 0.95)", // Bright green for current
      path: "rgba(0, 191, 255, 0.9)", // Bright blue for path
      good: "#32CD32", // Bright green for start
      bad: "#FF4500", // Bright red-orange for goal
      nodeStroke: "rgba(0,0,0,0.8)", // Strong stroke for definition
      importantStroke: "rgba(255,255,255,1)" // White stroke for start/goal
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
            background: "rgba(255,255,255,0.03)", // Slightly darker background for better contrast
            display: "block"
          }}
        >
          {/* edges */}
          {graph.edges.map((e, idx) => {
            const a = nodeAt.get(e.from);
            const b = nodeAt.get(e.to);
            if (!a || !b) return null;
            // Only draw each undirected edge once if data contains both directions.
            if (!graph.directed && e.from > e.to) return null;
            
            // Thinner edges for better node visibility
            const nodeCount = graph.nodes.length;
            const edgeWidth = nodeCount > 100 ? 0.8 : nodeCount > 50 ? 1 : nodeCount > 20 ? 1.2 : 1.5;
            
            return (
              <line
                key={idx}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={colors.line}
                strokeWidth={edgeWidth}
                opacity={0.8}
              />
            );
          })}

          {/* Path edges (highlight the path) */}
          {step?.path && step.path.length > 1 && graph.edges.map((e, idx) => {
            const a = nodeAt.get(e.from);
            const b = nodeAt.get(e.to);
            if (!a || !b) return null;
            
            // Check if this edge is part of the path
            const isPathEdge = step.path!.some((coord, i) => {
              if (i === 0) return false;
              const prevCoord = step.path![i - 1];
              return (
                (coord.x === a.x && coord.y === a.y && prevCoord.x === b.x && prevCoord.y === b.y) ||
                (coord.x === b.x && coord.y === b.y && prevCoord.x === a.x && prevCoord.y === a.y)
              );
            });
            
            if (!isPathEdge) return null;
            
            const nodeCount = graph.nodes.length;
            const pathWidth = nodeCount > 100 ? 1.5 : nodeCount > 50 ? 2 : nodeCount > 20 ? 2.5 : 3;
            
            return (
              <line
                key={`path-${idx}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={colors.path}
                strokeWidth={pathWidth}
                opacity={0.9}
              />
            );
          })}

          {/* nodes */}
          {graph.nodes.map((n) => {
            const k = n.id;
            let fill = colors.node;
            let stroke = colors.nodeStroke;
            let strokeWidth = 1.5;
            
            // Apply state-based colors with priority
            if (visited.has(k)) fill = colors.visited;
            if (frontierKeys.has(k)) fill = colors.frontier;
            if (pathCoordSet.has(`${n.at.x},${n.at.y}`)) fill = colors.path;
            if (closed.has(k)) fill = fill; // Keep current color for closed
            if (currentKey === k) fill = colors.current;
            
            // Special styling for start/goal with stronger differentiation
            if (k === startKey) {
              fill = colors.good;
              stroke = colors.importantStroke;
              strokeWidth = 1.8;
            }
            if (k === goalKey) {
              fill = colors.bad;
              stroke = colors.importantStroke;
              strokeWidth = 1.8;
            }

            const label = n.label ?? n.id;

            // Much smaller nodes for better differentiation
            const nodeCount = graph.nodes.length;
            const nodeRadius = nodeCount > 100 ? 2 : nodeCount > 50 ? 2.5 : nodeCount > 20 ? 3 : 3.5;
            const fontSize = nodeCount > 100 ? 6 : nodeCount > 50 ? 7 : nodeCount > 20 ? 8 : 9;
            const labelOffset = nodeRadius + 1.5;
            
            // Show labels more intelligently
            const isImportant = k === startKey || k === goalKey || n.label !== n.id || n.explanation;
            const showLabel = nodeCount <= 80 || isImportant;
            
            return (
              <g key={n.id} onClick={() => onNodeClick(n.id)} style={{ cursor: drawMode === "start" || drawMode === "goal" ? "pointer" : "default" }}>
                {/* Minimal shadow for definition */}
                <circle 
                  cx={n.at.x + 0.3} 
                  cy={n.at.y + 0.3} 
                  r={nodeRadius} 
                  fill="rgba(0,0,0,0.15)" 
                  opacity={0.3}
                />
                {/* Main node */}
                <circle 
                  cx={n.at.x} 
                  cy={n.at.y} 
                  r={nodeRadius} 
                  fill={fill} 
                  stroke={stroke} 
                  strokeWidth={strokeWidth}
                  opacity={0.95}
                />
                {/* Inner highlight for start/goal */}
                {(k === startKey || k === goalKey) && (
                  <circle 
                    cx={n.at.x} 
                    cy={n.at.y} 
                    r={nodeRadius - 1} 
                    fill="none" 
                    stroke="rgba(255,255,255,0.8)" 
                    strokeWidth={0.6}
                  />
                )}
                {showLabel && (
                  <>
                    {/* Label shadow for better readability */}
                    <text
                      x={n.at.x + labelOffset + 0.5}
                      y={n.at.y + 3.5}
                      fontSize={fontSize}
                      fill="rgba(0,0,0,0.6)"
                      style={{ userSelect: "none", fontWeight: "500" }}
                    >
                      {label}
                    </text>
                    {/* Main label */}
                    <text
                      x={n.at.x + labelOffset}
                      y={n.at.y + 3}
                      fontSize={fontSize}
                      fill="rgba(255,255,255,0.95)"
                      style={{ userSelect: "none", fontWeight: "500" }}
                    >
                      {label}
                    </text>
                  </>
                )}
                {n.explanation && (
                  <>
                    {/* Explanation shadow */}
                    <text
                      x={n.at.x + 1}
                      y={n.at.y - nodeRadius - 3}
                      fontSize={9}
                      fill="rgba(0,0,0,0.8)"
                      textAnchor="middle"
                      style={{ userSelect: "none", fontWeight: "700" }}
                    >
                      {n.explanation}
                    </text>
                    {/* Main explanation */}
                    <text
                      x={n.at.x}
                      y={n.at.y - nodeRadius - 4}
                      fontSize={9}
                      fill="rgba(255,212,59,0.95)"
                      textAnchor="middle"
                      style={{ userSelect: "none", fontWeight: "700" }}
                    >
                      {n.explanation}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Explanation Points */}
          {explanationPoints.map((p, idx) => (
            <g key={`expl-${idx}`}>
              {/* Shadow */}
              <circle
                cx={p.at.x + 0.5}
                cy={p.at.y + 0.5}
                r={4}
                fill="rgba(0,0,0,0.3)"
              />
              {/* Main circle */}
              <circle
                cx={p.at.x}
                cy={p.at.y}
                r={4}
                fill="rgba(255,212,59,0.8)"
                stroke="rgba(255,212,59,1)"
                strokeWidth={1.5}
              />
              {/* Text shadow */}
              <text
                x={p.at.x + 8.5}
                y={p.at.y + 4.5}
                fontSize={9}
                fill="rgba(0,0,0,0.6)"
                style={{ userSelect: "none", fontWeight: "500" }}
              >
                {p.text}
              </text>
              {/* Main text */}
              <text
                x={p.at.x + 8}
                y={p.at.y + 4}
                fontSize={9}
                fill="rgba(255,212,59,0.98)"
                style={{ userSelect: "none", fontWeight: "500" }}
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

