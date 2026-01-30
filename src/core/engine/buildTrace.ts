import type {
  AlgorithmId,
  Coord,
  Environment,
  FrontierItem,
  FrontierKind,
  RunOptions,
  StepSnapshot,
  Trace
} from "../types";
import { coordOf } from "../grid";
import { heuristicFn } from "../heuristics";
import { MinHeap } from "../structures/MinHeap";

type BuildTraceOptions = RunOptions;

type Neighbor = Readonly<{ key: string; cost: number }>;

type Adapter = Readonly<{
  kind: "grid" | "graph";
  coordOfKey: (key: string) => Coord;
  neighbors: (key: string) => ReadonlyArray<Neighbor>;
  edgeCostMode: "unit" | "weighted";
}>;

function frontierKindFor(algorithm: AlgorithmId): FrontierKind {
  switch (algorithm) {
    case "bfs":
      return "queue";
    case "dfs":
      return "stack";
    case "dijkstra":
    case "astar":
      return "minheap";
  }
}

function makeItem(
  at: Coord,
  key: string,
  algorithm: AlgorithmId,
  g: number,
  h: number,
  depth: number,
  w: number
): FrontierItem {
  if (algorithm === "bfs" || algorithm === "dfs") return { key, at, depth };
  if (algorithm === "dijkstra") return { key, at, g, priority: g };
  const f = g + w * h;
  return { key, at, g, h, f, priority: f };
}

function compareWhyNot(
  frontier: FrontierItem[],
  chosen: FrontierItem,
  metric: "g" | "f" | "depth"
) {
  const chosenValue =
    metric === "depth"
      ? chosen.depth ?? 0
      : metric === "g"
        ? chosen.g ?? Number.POSITIVE_INFINITY
        : chosen.f ?? Number.POSITIVE_INFINITY;

  // Pick a few "close contenders" for teaching value.
  const candidates = frontier
    .filter((x) => x.key !== chosen.key)
    .map((candidate) => {
      const candidateValue =
        metric === "depth"
          ? candidate.depth ?? 0
          : metric === "g"
            ? candidate.g ?? Number.POSITIVE_INFINITY
            : candidate.f ?? Number.POSITIVE_INFINITY;
      return { candidate, candidateValue };
    })
    .sort((a, b) => a.candidateValue - b.candidateValue)
    .slice(0, 4)
    .filter((c) => c.candidateValue !== chosenValue);

  return candidates.map((c) => ({
    candidate: c.candidate,
    chosen,
    metric,
    candidateValue: c.candidateValue,
    chosenValue
  }));
}

export function buildTrace(
  env: Environment,
  startKey: string,
  goalKey: string,
  options: BuildTraceOptions
): Trace {
  const adapter: Adapter = (() => {
    if (env.kind === "grid") {
      const grid = env.grid!;
      return {
        kind: "grid",
        coordOfKey: coordOf,
        neighbors: (key: string) => {
          const c = coordOf(key);
          const out: Neighbor[] = [];
          const candidates: Coord[] = [
            { x: c.x + 1, y: c.y },
            { x: c.x - 1, y: c.y },
            { x: c.x, y: c.y + 1 },
            { x: c.x, y: c.y - 1 }
          ];
          for (const nb of candidates) {
            if (nb.x < 0 || nb.y < 0 || nb.x >= grid.width || nb.y >= grid.height) continue;
            const nbKey = `${nb.x},${nb.y}`;
            if (grid.walls.has(nbKey)) continue;
            out.push({ key: nbKey, cost: 1 });
          }
          return out;
        },
        edgeCostMode: "unit"
      };
    }
    // Handle both "graph" and "map" kinds the same way
    const g = env.graph!;
    const nodeAt = new Map(g.nodes.map((n) => [n.id, n.at] as const));
    const adj = new Map<string, Neighbor[]>();
    for (const e of g.edges) {
      const arr = adj.get(e.from) ?? [];
      arr.push({ key: e.to, cost: e.cost });
      adj.set(e.from, arr);
      if (!g.directed) {
        const arr2 = adj.get(e.to) ?? [];
        arr2.push({ key: e.from, cost: e.cost });
        adj.set(e.to, arr2);
      }
    }
    return {
      kind: "graph",
      coordOfKey: (k: string) => nodeAt.get(k) ?? { x: 0, y: 0 },
      neighbors: (k: string) => adj.get(k) ?? [],
      edgeCostMode: "weighted"
    };
  })();

  const start = adapter.coordOfKey(startKey);
  const goal = adapter.coordOfKey(goalKey);

  function reconstructPathCoords(
    cameFromMap: ReadonlyMap<string, string>,
    startK: string,
    goalK: string
  ): Coord[] {
    if (startK === goalK) return [adapter.coordOfKey(startK)];
    if (!cameFromMap.has(goalK)) return [];
    const out: string[] = [];
    let cur = goalK;
    out.push(cur);
    while (cur !== startK) {
      const prev = cameFromMap.get(cur);
      if (!prev) break;
      cur = prev;
      out.push(cur);
    }
    out.reverse();
    return out.map(adapter.coordOfKey);
  }

  const visited = new Set<string>();
  const closed = new Set<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();

  const steps: StepSnapshot[] = [];

  const hFn = heuristicFn(options.heuristic);
  const fk = frontierKindFor(options.algorithm);

  let relaxations = 0;
  let peakFrontier = 0;
  let peakClosed = 0;

  // Frontier representations
  const queue: FrontierItem[] = [];
  const stack: FrontierItem[] = [];
  const heap = new MinHeap<FrontierItem>();

  function frontierToArray(): FrontierItem[] {
    if (fk === "queue") return [...queue];
    if (fk === "stack") return [...stack];
    return heap.toArray().map((n) => n.value);
  }

  function pushStep(partial: Omit<StepSnapshot, "index" | "frontierKind" | "frontier" | "visited" | "closed" | "cameFrom" | "gScore">) {
    const frontier = frontierToArray();
    peakFrontier = Math.max(peakFrontier, frontier.length);
    peakClosed = Math.max(peakClosed, closed.size);

    const step: StepSnapshot = {
      index: steps.length,
      frontierKind: fk,
      frontier,
      visited: new Set(visited),
      closed: new Set(closed),
      cameFrom: new Map(cameFrom),
      gScore: new Map(gScore),
      ...partial
    };
    steps.push(step);
  }

  // Seed
  visited.add(startKey);
  gScore.set(startKey, 0);
  const startItem = makeItem(
    start,
    startKey,
    options.algorithm,
    0,
    hFn(start, goal),
    0,
    options.heuristicWeight
  );
  if (fk === "queue") queue.push(startItem);
  if (fk === "stack") stack.push(startItem);
  if (fk === "minheap") heap.push({ id: startKey, value: startItem, priority: startItem.priority ?? 0 });

  pushStep({
    phase: "init",
    currentKey: null
  });

  const sizeBasis =
    env.kind === "grid"
      ? (env.grid!.width * env.grid!.height)
      : env.graph!.nodes.length;
  // For small graphs (like real-world routes), ensure minimum iterations
  // For large graphs, use a multiplier. Cap at reasonable maximum.
  const minIterations = 100;
  const maxIterations = Math.max(minIterations, Math.min(sizeBasis * 20, 10000));
  let iterations = 0;

  function addWarning(stepWarnings: string[], msg: string) {
    if (!stepWarnings.includes(msg)) stepWarnings.push(msg);
  }

  while (frontierToArray().length > 0) {
    iterations++;
    if (iterations > maxIterations) {
      pushStep({
        phase: "exhausted",
        currentKey: null,
        warnings: [
          "Stopped early to avoid an infinite/very long run (iteration cap hit)."
        ]
      });
      break;
    }

    const warnings: string[] = [];

    // Select
    let selected: FrontierItem | null = null;
    if (fk === "queue") selected = queue.shift() ?? null;
    if (fk === "stack") selected = stack.pop() ?? null;
    if (fk === "minheap") {
      // We may have duplicates instead of decrease-key; skip stale entries.
      while (true) {
        const popped = heap.pop()?.value ?? null;
        if (!popped) break;
        if (closed.has(popped.key)) continue;
        const bestKnown = gScore.get(popped.key);
        if (bestKnown != null && popped.g != null && popped.g > bestKnown) continue;
        selected = popped;
        break;
      }
    }
    if (!selected) break;
    if (closed.has(selected.key)) continue;

    const selectionReason =
      options.algorithm === "bfs"
        ? { kind: "fifo" as const }
        : options.algorithm === "dfs"
          ? { kind: "lifo" as const }
          : options.algorithm === "dijkstra"
            ? {
                kind: "min" as const,
                metric: "g" as const,
                value: selected.g ?? 0
              }
            : {
                kind: "min" as const,
                metric: "f" as const,
                value: selected.f ?? selected.priority ?? 0
              };

    const frontierNow = frontierToArray();
    const whyNot =
      fk === "minheap"
        ? compareWhyNot(
            [selected, ...frontierNow],
            selected,
            options.algorithm === "dijkstra" ? "g" : "f"
          )
        : undefined;

    pushStep({
      phase: "select",
      currentKey: selected.key,
      current: selected.at,
      selected,
      selectionReason,
      whyNot
    });

    if (selected.key === goalKey) {
      const path = reconstructPathCoords(cameFrom, startKey, goalKey);
      pushStep({
        phase: "found",
        currentKey: selected.key,
        current: selected.at,
        selected,
        selectionReason: { kind: "goal" },
        path,
        warnings:
          options.algorithm === "astar" && options.heuristicWeight > 1
            ? [
                "This A* run uses a weighted heuristic (>1), which can be faster but may produce a suboptimal path."
              ]
            : undefined
      });
      break;
    }

    // Expand
    closed.add(selected.key);
    pushStep({
      phase: "expand",
      currentKey: selected.key,
      current: selected.at,
      selected,
      selectionReason
    });

    // Failure/inefficiency highlights (lightweight heuristics)
    const frontierSize = frontierToArray().length;
    const totalNodes = sizeBasis;
    if (options.algorithm === "bfs" && frontierSize > totalNodes * 0.35) {
      addWarning(
        warnings,
        env.kind === "grid"
          ? "BFS frontier is growing large — BFS can become memory-intensive on wide open maps."
          : "BFS frontier is growing large — BFS can become memory-intensive on wide/branchy graphs."
      );
    }
    if (options.algorithm === "dfs" && (selected.depth ?? 0) > totalNodes * 0.35) {
      addWarning(
        warnings,
        "DFS is going very deep — DFS can get “stuck” exploring long branches before finding a good route."
      );
    }
    if (options.algorithm === "astar" && options.heuristicWeight > 1) {
      addWarning(
        warnings,
        "Weighted A*: heuristic is amplified — may trade optimality for speed."
      );
    }
    if (warnings.length) {
      pushStep({
        phase: "expand",
        currentKey: selected.key,
        current: selected.at,
        selected,
        selectionReason,
        warnings
      });
    }

    // Neighbors
    const curG = gScore.get(selected.key) ?? 0;
    const curDepth = selected.depth ?? 0;
    const neighborList = adapter.neighbors(selected.key);
    for (const nb of neighborList) {
      const nbKey = nb.key;
      if (closed.has(nbKey)) continue;
      const nbCoord = adapter.coordOfKey(nbKey);
      const stepCost =
        options.algorithm === "bfs" || options.algorithm === "dfs"
          ? 1
          : adapter.edgeCostMode === "weighted"
            ? nb.cost
            : 1;

      if (options.algorithm === "bfs" || options.algorithm === "dfs") {
        if (visited.has(nbKey)) continue;
        visited.add(nbKey);
        cameFrom.set(nbKey, selected.key);
        const nbItem = makeItem(
          nbCoord,
          nbKey,
          options.algorithm,
          curG + stepCost,
          0,
          curDepth + 1,
          options.heuristicWeight
        );
        pushStep({
          phase: "enqueue",
          currentKey: selected.key,
          current: selected.at,
          selected,
          selectionReason,
          relaxation: {
            from: selected.key,
            to: nbKey,
            oldG: null,
            newG: curG + stepCost,
            improved: true
          }
        });
        if (fk === "queue") queue.push(nbItem);
        else stack.push(nbItem);
        pushStep({
          phase: "enqueue",
          currentKey: selected.key,
          current: selected.at,
          selected,
          selectionReason
        });
        continue;
      }

      // Dijkstra / A*
      const tentativeG = curG + stepCost;
      const oldG = gScore.has(nbKey) ? (gScore.get(nbKey) ?? null) : null;
      const improved = oldG === null || tentativeG < oldG;

      if (!improved) continue;

      cameFrom.set(nbKey, selected.key);
      gScore.set(nbKey, tentativeG);
      visited.add(nbKey);
      relaxations++;

      const h = options.algorithm === "astar" ? hFn(nbCoord, goal) : 0;
      const nbItem = makeItem(
        nbCoord,
        nbKey,
        options.algorithm,
        tentativeG,
        h,
        curDepth + 1,
        options.heuristicWeight
      );

      pushStep({
        phase: "relax",
        currentKey: selected.key,
        current: selected.at,
        selected,
        selectionReason,
        relaxation: {
          from: selected.key,
          to: nbKey,
          oldG,
          newG: tentativeG,
          improved: true
        }
      });

      heap.push({
        id: nbKey,
        value: nbItem,
        priority: nbItem.priority ?? tentativeG
      });

      pushStep({
        phase: "enqueue",
        currentKey: selected.key,
        current: selected.at,
        selected,
        selectionReason
      });
    }
  }

  const found = steps.some((s) => s.phase === "found");
  let path: Coord[] = [];
  if (found) {
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i];
      if (s?.phase === "found" && s.path) {
        path = [...s.path];
        console.log(`[buildTrace] Path found with ${path.length} nodes`);
        break;
      }
    }
  } else {
    console.warn(`[buildTrace] Path not found. Steps: ${steps.length}, Explored: ${closed.size}, Final frontier: ${frontierToArray().length}`);
    // Check if start and goal are connected
    if (adapter.kind === "graph") {
      const startNeighbors = adapter.neighbors(startKey);
      const goalNeighbors = adapter.neighbors(goalKey);
      console.log(`[buildTrace] Start neighbors: ${startNeighbors.length}, Goal neighbors: ${goalNeighbors.length}`);
    }
  }

  return {
    options,
    steps,
    found,
    path,
    metrics: {
      explored: closed.size,
      relaxations,
      peakFrontier,
      peakClosed,
      runtimeSteps: steps.length
    }
  };
}

