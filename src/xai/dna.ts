import type { AlgorithmId, StepSnapshot, Trace } from "../core/types";

export type AlgorithmDNA = Readonly<{
  algorithm: AlgorithmId;
  fingerprint: ReadonlyArray<string>;
  explored: number;
  pathLength: number;
  peakFrontier: number;
  peakClosed: number;
  optimality: "optimal" | "not-guaranteed";
  explorationStyle: "wide" | "deep" | "balanced";
  tradeoff: "speed" | "memory" | "accuracy" | "balanced";
  notes: ReadonlyArray<string>;
}>;

function styleFromSteps(steps: ReadonlyArray<StepSnapshot>): "wide" | "deep" | "balanced" {
  const selectedDepths: number[] = [];
  const frontierSizes: number[] = [];
  for (const s of steps) {
    if (s.selected?.depth != null) selectedDepths.push(s.selected.depth);
    frontierSizes.push(s.frontier.length);
  }
  const avgDepth =
    selectedDepths.length === 0
      ? 0
      : selectedDepths.reduce((a, b) => a + b, 0) / selectedDepths.length;
  const avgFrontier =
    frontierSizes.length === 0
      ? 0
      : frontierSizes.reduce((a, b) => a + b, 0) / frontierSizes.length;

  // Heuristic: wide algorithms keep a larger frontier on average; deep ones increase depth faster.
  if (avgFrontier > Math.max(8, avgDepth * 2)) return "wide";
  if (avgDepth > Math.max(8, avgFrontier)) return "deep";
  return "balanced";
}

function optimalityOf(trace: Trace, algorithm: AlgorithmId): "optimal" | "not-guaranteed" {
  if (!trace.found) return "not-guaranteed";
  if (algorithm === "bfs") return "optimal"; // unweighted grid
  if (algorithm === "dijkstra") return "optimal";
  if (algorithm === "astar" && trace.options.heuristicWeight <= 1) return "optimal";
  return "not-guaranteed";
}

export function computeAlgorithmDNA(trace: Trace, algorithm: AlgorithmId): AlgorithmDNA {
  const style = styleFromSteps(trace.steps);
  const opt = optimalityOf(trace, algorithm);

  const notes = new Set<string>();
  for (const s of trace.steps) {
    for (const w of s.warnings ?? []) notes.add(w);
  }

  // Tradeoff heuristic
  let tradeoff: AlgorithmDNA["tradeoff"] = "balanced";
  if (algorithm === "bfs") tradeoff = "memory";
  if (algorithm === "dfs") tradeoff = "speed";
  if (algorithm === "dijkstra") tradeoff = "accuracy";
  if (algorithm === "astar") tradeoff = trace.options.heuristicWeight > 1 ? "speed" : "balanced";

  const fingerprint: string[] = [];
  switch (algorithm) {
    case "bfs":
      fingerprint.push("BFS: explores level-by-level (wide wavefront).");
      fingerprint.push("Safe and optimal on unweighted grids, but can be memory-intensive.");
      break;
    case "dfs":
      fingerprint.push("DFS: dives deep along one branch (depth-first).");
      fingerprint.push("Often fast to find *a* path, but not reliable for shortest paths.");
      break;
    case "dijkstra":
      fingerprint.push("Dijkstra: expands by lowest known cost g(n).");
      fingerprint.push("Optimal, but can explore many nodes when the goal is far.");
      break;
    case "astar":
      fingerprint.push("A*: expands by lowest f(n)=g(n)+h(n) (goal-directed).");
      fingerprint.push("Efficient with a good heuristic; can be suboptimal with bad/overweighted heuristics.");
      break;
  }

  return {
    algorithm,
    fingerprint,
    explored: trace.metrics.explored,
    pathLength: trace.path.length,
    peakFrontier: trace.metrics.peakFrontier,
    peakClosed: trace.metrics.peakClosed,
    optimality: opt,
    explorationStyle: style,
    tradeoff,
    notes: [...notes]
  };
}

