import type {
  AlgorithmId,
  LearningLevel,
  StepSnapshot,
  Trace
} from "../core/types";

export type Narration = Readonly<{
  title: string;
  text: string;
  whyNot: ReadonlyArray<string>;
}>;

function nodeLabel(s: StepSnapshot, key?: string | null) {
  if (!key) return "—";
  const c = key.split(",").map(Number);
  if (c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
    return `(${c[0]},${c[1]})`;
  }
  return key;
}

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(1) : "∞";
}

export function narrateStep(args: {
  algorithm: AlgorithmId;
  step: StepSnapshot | null;
  trace: Trace | null;
  stepIndex: number;
  explainMode: boolean;
  learningLevel: LearningLevel;
}): Narration {
  const { algorithm, step, explainMode, learningLevel, trace } = args;

  if (!step) {
    return {
      title: "No run yet",
      text: "Draw walls, set start/goal, choose an algorithm, then click Run.",
      whyNot: []
    };
  }

  if (learningLevel === "advanced") {
    return {
      title: "Silent mode",
      text: step.phase === "found" ? "Goal reached. Check the path on the grid." : "Step through to inspect the data structures.",
      whyNot: []
    };
  }

  const cur = nodeLabel(step, step.currentKey);
  const title = (() => {
    switch (step.phase) {
      case "init":
        return "Initialization";
      case "select":
        return "Selecting next node";
      case "expand":
        return "Expanding node";
      case "relax":
        return "Relaxing an edge";
      case "enqueue":
        return "Updating the frontier";
      case "found":
        return "Goal found";
      case "exhausted":
        return "Search failed";
      default:
        return "Step";
    }
  })();

  const whyNot: string[] = [];
  if (explainMode && step.whyNot?.length) {
    for (const r of step.whyNot.slice(0, 3)) {
      whyNot.push(
        `Skipped ${nodeLabel(step, r.candidate.key)} because its ${r.metric}(n)=${fmt(
          r.candidateValue
        )} is higher than chosen ${nodeLabel(step, r.chosen.key)} with ${r.metric}(n)=${fmt(
          r.chosenValue
        )}.`
      );
    }
  }

  const text = (() => {
    switch (step.phase) {
      case "init":
        if (trace?.options.environmentId !== "grid") {
          return "We start by placing the Start location into the frontier. Same algorithms, now running on a real-world-style graph.";
        }
        return "We start by placing the Start node into the frontier and setting its cost to 0.";
      case "select": {
        if (algorithm === "bfs") {
          return trace?.options.environmentId !== "grid"
            ? `Selected ${cur} because BFS expands the oldest discovered location first (FIFO). Note: BFS ignores road/path costs and counts “number of hops”.`
            : `Selected ${cur} because BFS always expands the oldest discovered node first (FIFO queue).`;
        }
        if (algorithm === "dfs") {
          return `Selected ${cur} because DFS always expands the most recently discovered node first (LIFO stack).`;
        }
        if (algorithm === "dijkstra") {
          const g = step.selected?.g ?? 0;
          if (trace?.options.environmentId === "grid") {
            return `Selected ${cur} because it has the lowest current cost g(n)=${fmt(
              g
            )}. On a unit-cost grid, Dijkstra often looks similar to BFS (both find the shortest path).`;
          }
          return `Selected ${cur} because it has the lowest current travel cost g(n)=${fmt(g)} among all frontier locations.`;
        }
        const f = step.selected?.f ?? step.selected?.priority ?? 0;
        const w = trace?.options.heuristicWeight ?? 1;
        if (w === 0) {
          return `Selected ${cur} because with heuristic weight 0, A* becomes Dijkstra (it prioritizes g(n) only).`;
        }
        return `Selected ${cur} because it has the lowest f(n)=${fmt(
          f
        )} among all frontier nodes (A* picks the smallest g(n)+${w.toFixed(2)}·h(n)).`;
      }
      case "expand":
        return `Now we expand ${cur}: we look at its neighbors and decide whether to add them to the frontier (or improve their costs).`;
      case "relax": {
        const r = step.relaxation;
        if (!r) return `We try to improve a neighbor's cost estimate.`;
        const from = nodeLabel(step, r.from);
        const to = nodeLabel(step, r.to);
        if (r.oldG === null) {
          return `Discovered ${to} from ${from}. We set its cost to g(n)=${fmt(
            r.newG
          )} and remember that it came from ${from}.`;
        }
        return `Found a cheaper route to ${to} via ${from}: g(n) improved from ${fmt(
          r.oldG
        )} to ${fmt(r.newG)}. We update the parent link and (re)insert it into the frontier.`;
      }
      case "enqueue":
        return "Frontier updated. Next, the algorithm will select another node based on its rules.";
      case "found":
        return `Goal reached at ${cur}. We reconstruct the final path by following parent links backwards from Goal to Start.`;
      case "exhausted":
        return "The frontier became empty before reaching the goal — no path exists with the current obstacles.";
      default:
        return "Step executed.";
    }
  })();

  if (learningLevel === "intermediate") {
    // Hints only: keep narration short.
    return {
      title,
      text:
        step.phase === "select"
          ? text
          : step.phase === "found"
            ? text
            : `Phase: ${step.phase}. Current: ${cur}.`,
      whyNot: explainMode ? whyNot : []
    };
  }

  // Beginner
  return {
    title,
    text,
    whyNot: explainMode ? whyNot : []
  };
}

