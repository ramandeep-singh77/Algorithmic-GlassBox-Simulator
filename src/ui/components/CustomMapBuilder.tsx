import React, { useState, useMemo } from "react";
import type { Coord, Graph, GraphNode } from "../../core/types";

type Props = Readonly<{
  graph: Graph;
  onGraphChange: (graph: Graph) => void;
  onExplanationPointsChange: (points: Array<{ at: Coord; text: string }>) => void;
  explanationPoints: ReadonlyArray<{ at: Coord; text: string }>;
}>;

function dist(a: Coord, b: Coord) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function CustomMapBuilder({
  graph,
  onGraphChange,
  onExplanationPointsChange,
  explanationPoints
}: Props) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeX, setNewNodeX] = useState(50);
  const [newNodeY, setNewNodeY] = useState(50);
  const [explanationText, setExplanationText] = useState("");
  const [explanationX, setExplanationX] = useState(50);
  const [explanationY, setExplanationY] = useState(50);
  const [editingExplanation, setEditingExplanation] = useState<number | null>(null);

  const nodeMap = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n] as const)), [graph.nodes]);

  const addNode = () => {
    if (!newNodeLabel.trim()) return;
    const id = newNodeLabel.trim();
    if (nodeMap.has(id)) {
      alert(`Node "${id}" already exists`);
      return;
    }
    const newNode: GraphNode = {
      id,
      at: { x: newNodeX, y: newNodeY },
      label: id
    };
    onGraphChange({
      ...graph,
      nodes: [...graph.nodes, newNode]
    });
    setNewNodeLabel("");
  };

  const deleteNode = (id: string) => {
    const newNodes = graph.nodes.filter((n) => n.id !== id);
    const newEdges = graph.edges.filter((e) => e.from !== id && e.to !== id);
    onGraphChange({ ...graph, nodes: newNodes, edges: newEdges });
    if (selectedNode === id) setSelectedNode(null);
  };

  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    const fromNode = nodeMap.get(from);
    const toNode = nodeMap.get(to);
    if (!fromNode || !toNode) return;
    const cost = dist(fromNode.at, toNode.at);
    const exists = graph.edges.some((e) => e.from === from && e.to === to);
    if (exists) return;
    onGraphChange({
      ...graph,
      edges: [...graph.edges, { from, to, cost }]
    });
  };

  const deleteEdge = (from: string, to: string) => {
    onGraphChange({
      ...graph,
      edges: graph.edges.filter((e) => !(e.from === from && e.to === to))
    });
  };

  const addExplanationPoint = () => {
    if (!explanationText.trim()) return;
    onExplanationPointsChange([
      ...explanationPoints,
      { at: { x: explanationX, y: explanationY }, text: explanationText.trim() }
    ]);
    setExplanationText("");
  };

  const deleteExplanationPoint = (idx: number) => {
    onExplanationPointsChange(explanationPoints.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="small" style={{ fontWeight: 600 }}>Custom Map Builder</div>

      {/* Add Node */}
      <div style={{ display: "grid", gap: 6 }}>
        <div className="small">Add Node</div>
        <div className="controlsRow">
          <input
            type="text"
            placeholder="Node ID"
            value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "6px 8px",
              color: "var(--text)",
              fontSize: 12
            }}
          />
          <input
            type="number"
            placeholder="X"
            value={newNodeX}
            onChange={(e) => setNewNodeX(Number(e.target.value))}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "6px 8px",
              color: "var(--text)",
              fontSize: 12,
              width: 60
            }}
          />
          <input
            type="number"
            placeholder="Y"
            value={newNodeY}
            onChange={(e) => setNewNodeY(Number(e.target.value))}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "6px 8px",
              color: "var(--text)",
              fontSize: 12,
              width: 60
            }}
          />
          <button onClick={addNode}>Add</button>
        </div>
      </div>

      {/* Connect Nodes */}
      {graph.nodes.length >= 2 && (
        <div style={{ display: "grid", gap: 6 }}>
          <div className="small">Connect Nodes</div>
          <div className="controlsRow">
            <select
              value={selectedNode || ""}
              onChange={(e) => setSelectedNode(e.target.value || null)}
              style={{ flex: 1 }}
            >
              <option value="">Select first node...</option>
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label || n.id}
                </option>
              ))}
            </select>
            {selectedNode && (
              <>
                <span className="mono">→</span>
                <select
                  onChange={(e) => {
                    if (e.target.value && selectedNode) {
                      addEdge(selectedNode, e.target.value);
                      setSelectedNode(null);
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <option value="">Select second node...</option>
                  {graph.nodes
                    .filter((n) => n.id !== selectedNode)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label || n.id}
                      </option>
                    ))}
                </select>
              </>
            )}
          </div>
        </div>
      )}

      {/* Nodes List */}
      {graph.nodes.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <div className="small">Nodes ({graph.nodes.length})</div>
          <div style={{ display: "grid", gap: 4, maxHeight: 120, overflowY: "auto" }}>
            {graph.nodes.map((n) => (
              <div
                key={n.id}
                className="controlsRow"
                style={{
                  padding: 6,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8
                }}
              >
                <span className="mono">{n.label || n.id}</span>
                <span className="mono" style={{ fontSize: 10 }}>
                  ({n.at.x}, {n.at.y})
                </span>
                <button
                  onClick={() => deleteNode(n.id)}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edges List */}
      {graph.edges.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <div className="small">Edges ({graph.edges.length})</div>
          <div style={{ display: "grid", gap: 4, maxHeight: 100, overflowY: "auto" }}>
            {graph.edges.map((e, idx) => (
              <div
                key={idx}
                className="controlsRow"
                style={{
                  padding: 4,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 6,
                  fontSize: 11
                }}
              >
                <span className="mono">
                  {e.from} → {e.to}
                </span>
                <span className="mono" style={{ fontSize: 10 }}>
                  cost: {e.cost.toFixed(1)}
                </span>
                <button
                  onClick={() => deleteEdge(e.from, e.to)}
                  style={{ padding: "2px 6px", fontSize: 10 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Explanation Point */}
      <div style={{ display: "grid", gap: 6 }}>
        <div className="small">Add Explanation Point</div>
        <textarea
          placeholder="Explanation text (e.g., 'This is a highway')"
          value={explanationText}
          onChange={(e) => setExplanationText(e.target.value)}
          rows={2}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "6px 8px",
            color: "var(--text)",
            fontSize: 12,
            resize: "vertical"
          }}
        />
        <div className="controlsRow">
          <input
            type="number"
            placeholder="X"
            value={explanationX}
            onChange={(e) => setExplanationX(Number(e.target.value))}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "6px 8px",
              color: "var(--text)",
              fontSize: 12,
              width: 70
            }}
          />
          <input
            type="number"
            placeholder="Y"
            value={explanationY}
            onChange={(e) => setExplanationY(Number(e.target.value))}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "6px 8px",
              color: "var(--text)",
              fontSize: 12,
              width: 70
            }}
          />
          <button onClick={addExplanationPoint}>Add Point</button>
        </div>
      </div>

      {/* Explanation Points List */}
      {explanationPoints.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <div className="small">Explanation Points ({explanationPoints.length})</div>
          <div style={{ display: "grid", gap: 4, maxHeight: 120, overflowY: "auto" }}>
            {explanationPoints.map((p, idx) => (
              <div
                key={idx}
                style={{
                  padding: 6,
                  background: "rgba(255,212,59,0.1)",
                  border: "1px solid rgba(255,212,59,0.2)",
                  borderRadius: 8,
                  fontSize: 11
                }}
              >
                <div className="mono" style={{ fontSize: 10, marginBottom: 4 }}>
                  ({p.at.x}, {p.at.y})
                </div>
                <div>{p.text}</div>
                <button
                  onClick={() => deleteExplanationPoint(idx)}
                  style={{ marginTop: 4, padding: "2px 6px", fontSize: 10 }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
