import React from "react";
import type { AlgorithmId, StepSnapshot, Trace } from "../../core/types";
import type { AlgorithmDNA } from "../../xai/dna";

type Props = Readonly<{
  algorithm: AlgorithmId;
  step: StepSnapshot | null;
  trace: Trace | null;
  dna: AlgorithmDNA | null;
  compareAlgorithm: AlgorithmId;
  compareTrace: Trace | null;
  compareDna: AlgorithmDNA | null;
}>;

function bigO(alg: AlgorithmId) {
  switch (alg) {
    case "bfs":
    case "dfs":
      return { time: "O(V+E)", space: "O(V)" };
    case "dijkstra":
      return { time: "O((V+E) log V)", space: "O(V)" };
    case "astar":
      return { time: "O((V+E) log V)", space: "O(V)" };
  }
}

function approxMemoryBytes(step: StepSnapshot) {
  // Super rough: each node stored in sets/maps etc. Teach-relative, not exact.
  const nodeCount = step.frontier.length + step.closed.size + step.visited.size;
  return nodeCount * 48;
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function MetricsPanel({
  algorithm,
  step,
  trace,
  dna,
  compareAlgorithm,
  compareTrace,
  compareDna
}: Props) {
  const theo = bigO(algorithm);

  if (!step) {
    return <div className="small">Run to see live metrics.</div>;
  }

  const mem = approxMemoryBytes(step);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="kv">
        <div className="k">Observed explored (closed)</div>
        <div className="v mono">{step.closed.size}</div>

        <div className="k">Visited (discovered)</div>
        <div className="v mono">{step.visited.size}</div>

        <div className="k">Frontier size</div>
        <div className="v mono">{step.frontier.length}</div>

        <div className="k">Approx memory</div>
        <div className="v mono">{fmtBytes(mem)}</div>
      </div>

      <div className="kv">
        <div className="k">Theoretical time</div>
        <div className="v mono">{theo.time}</div>
        <div className="k">Theoretical space</div>
        <div className="v mono">{theo.space}</div>
      </div>

      {trace ? (
        <div className="kv">
          <div className="k">Run steps</div>
          <div className="v mono">{trace.metrics.runtimeSteps}</div>
          <div className="k">Peak frontier</div>
          <div className="v mono">{trace.metrics.peakFrontier}</div>
          <div className="k">Path length</div>
          <div className="v mono">{trace.path.length ? trace.path.length : "—"}</div>
          <div className="k">Optimality</div>
          <div className="v mono">{dna?.optimality ?? "—"}</div>
        </div>
      ) : null}

      {compareTrace ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="small">Comparison summary</div>
          <div className="twoCol">
            <div className="kv">
              <div className="k">{algorithm.toUpperCase()} explored</div>
              <div className="v mono">{trace?.metrics.explored ?? "—"}</div>
              <div className="k">{algorithm.toUpperCase()} path</div>
              <div className="v mono">{trace?.path.length ?? "—"}</div>
            </div>
            <div className="kv">
              <div className="k">{compareAlgorithm.toUpperCase()} explored</div>
              <div className="v mono">{compareTrace.metrics.explored}</div>
              <div className="k">{compareAlgorithm.toUpperCase()} path</div>
              <div className="v mono">{compareTrace.path.length || "—"}</div>
            </div>
          </div>
          <div className="warning">
            {algorithm.toUpperCase()} optimality:{" "}
            <span className="mono">{dna?.optimality ?? "—"}</span>
            {"  "}•{"  "}
            {compareAlgorithm.toUpperCase()} optimality:{" "}
            <span className="mono">{compareDna?.optimality ?? "—"}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

