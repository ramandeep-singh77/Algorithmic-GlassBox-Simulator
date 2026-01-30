import type {
  AlgorithmId,
  Coord,
  DrawMode,
  EnvironmentId,
  Graph,
  Grid,
  HeuristicId,
  LatLng,
  LearningLevel,
  Trace
} from "../../core/types";
import { setWall } from "../../core/grid";
import type { AlgorithmDNA } from "../../xai/dna";
import { getEnvironment } from "../../core/environments/catalog";

export type GridEdit =
  | { kind: "wall"; key: string; on: boolean }
  | { kind: "start"; key: string }
  | { kind: "goal"; key: string };

export type SimulatorState = Readonly<{
  environmentId: EnvironmentId;
  grid: Grid;
  customGraph: Graph;
  customExplanationPoints: ReadonlyArray<{ at: Coord; text: string }>;
  realWorldStart: LatLng | null;
  realWorldGoal: LatLng | null;
  realWorldGraph: Graph;
  startKey: string;
  goalKey: string;
  drawMode: DrawMode;

  algorithm: AlgorithmId;
  compareOn: boolean;
  compareAlgorithm: AlgorithmId;
  heuristic: HeuristicId;
  heuristicWeight: number;

  learningLevel: LearningLevel;
  explainMode: boolean;

  speedMs: number;
  isPlaying: boolean;

  trace: Trace | null;
  dna: AlgorithmDNA | null;
  compareTrace: Trace | null;
  compareDna: AlgorithmDNA | null;
  stepIndex: number;
}>;

export type SimulatorAction =
  | { type: "hydrateAfterRun"; next: SimulatorState }
  | { type: "run" }
  | { type: "resetTrace" }
  | { type: "togglePlay" }
  | { type: "step"; direction: -1 | 1 }
  | { type: "setSpeed"; ms: number }
  | { type: "setEnvironment"; environmentId: EnvironmentId }
  | { type: "setCustomGraph"; graph: Graph }
  | { type: "setCustomExplanationPoints"; points: Array<{ at: Coord; text: string }> }
  | { type: "setRealWorldStart"; lat: number; lng: number }
  | { type: "setRealWorldGoal"; lat: number; lng: number }
  | { type: "setRealWorldGraph"; graph: Graph }
  | { type: "setAlgorithm"; algorithm: AlgorithmId }
  | { type: "setCompareOn"; on: boolean }
  | { type: "setCompareAlgorithm"; algorithm: AlgorithmId }
  | { type: "setHeuristic"; heuristic: HeuristicId }
  | { type: "setHeuristicWeight"; weight: number }
  | { type: "setLearningLevel"; level: LearningLevel }
  | { type: "setExplainMode"; on: boolean }
  | { type: "setDrawMode"; mode: DrawMode }
  | { type: "applyEdit"; edit: GridEdit }
  | { type: "clearWalls" }
  | { type: "randomWalls" };

export const DEFAULT_SIM: SimulatorState = {
  environmentId: "grid",
  grid: getEnvironment("grid").grid!,
  customGraph: { directed: true, nodes: [], edges: [] },
  customExplanationPoints: [],
  realWorldStart: null,
  realWorldGoal: null,
  realWorldGraph: { directed: true, nodes: [], edges: [] },
  startKey: getEnvironment("grid").defaultStartKey,
  goalKey: getEnvironment("grid").defaultGoalKey,
  drawMode: "walls",

  algorithm: "astar",
  compareOn: false,
  compareAlgorithm: "dijkstra",
  heuristic: "manhattan",
  heuristicWeight: 1,

  learningLevel: "beginner",
  explainMode: true,

  speedMs: 120,
  isPlaying: false,

  trace: null,
  dna: null,
  compareTrace: null,
  compareDna: null,
  stepIndex: 0
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function resetPlayback(state: SimulatorState): SimulatorState {
  return { ...state, isPlaying: false, stepIndex: 0 };
}

export function simulatorReducer(
  state: SimulatorState,
  action: SimulatorAction
): SimulatorState {
  switch (action.type) {
    case "hydrateAfterRun":
      return action.next;
    case "run":
      return state;
    case "resetTrace":
      return {
        ...state,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null,
        isPlaying: false,
        stepIndex: 0
      };
    case "togglePlay":
      if (!state.trace) return state;
      return { ...state, isPlaying: !state.isPlaying };
    case "step": {
      if (!state.trace) return state;
      const last = state.trace.steps.length - 1;
      const next = clamp(
        state.stepIndex + action.direction,
        0,
        last
      );
      const stopAtEnd = action.direction === 1 && next === last;
      return { ...state, stepIndex: next, isPlaying: stopAtEnd ? false : state.isPlaying };
    }
    case "setSpeed":
      return { ...state, speedMs: clamp(action.ms, 20, 1500) };
    case "setEnvironment": {
      const env = getEnvironment(
        action.environmentId,
        action.environmentId === "custom" ? state.customGraph : undefined,
        action.environmentId === "custom" ? state.customExplanationPoints : undefined,
        action.environmentId === "realworld" && state.realWorldStart ? state.realWorldStart : undefined,
        action.environmentId === "realworld" && state.realWorldGoal ? state.realWorldGoal : undefined,
        action.environmentId === "realworld" ? state.realWorldGraph : undefined
      );
      const nextGrid = env.kind === "grid" ? env.grid! : state.grid;
      const customGraph = action.environmentId === "custom" ? state.customGraph : { directed: true, nodes: [], edges: [] };
      const realWorldGraph = action.environmentId === "realworld" ? state.realWorldGraph : { directed: true, nodes: [], edges: [] };
      return resetPlayback({
        ...state,
        environmentId: action.environmentId,
        grid: nextGrid,
        customGraph,
        realWorldGraph,
        startKey:
          action.environmentId === "custom" && customGraph.nodes.length > 0
            ? customGraph.nodes[0]!.id
            : action.environmentId === "realworld" && realWorldGraph.nodes.length > 0
              ? realWorldGraph.nodes[0]!.id
              : env.defaultStartKey,
        goalKey:
          action.environmentId === "custom" && customGraph.nodes.length > 1
            ? customGraph.nodes[1]!.id
            : action.environmentId === "realworld" && realWorldGraph.nodes.length > 1
              ? realWorldGraph.nodes[realWorldGraph.nodes.length - 1]!.id
              : env.defaultGoalKey,
        drawMode: env.kind === "grid" ? state.drawMode : "start",
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    }
    case "setRealWorldStart":
      return resetPlayback({
        ...state,
        realWorldStart: { lat: action.lat, lng: action.lng },
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setRealWorldGoal":
      return resetPlayback({
        ...state,
        realWorldGoal: { lat: action.lat, lng: action.lng },
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setRealWorldGraph":
      return resetPlayback({
        ...state,
        realWorldGraph: action.graph,
        startKey: action.graph.nodes.length > 0 ? action.graph.nodes[0]!.id : state.startKey,
        goalKey: action.graph.nodes.length > 0 ? action.graph.nodes[action.graph.nodes.length - 1]!.id : state.goalKey,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setCustomGraph":
      return resetPlayback({
        ...state,
        customGraph: action.graph,
        startKey: action.graph.nodes.length > 0 ? (state.startKey && action.graph.nodes.some((n) => n.id === state.startKey) ? state.startKey : action.graph.nodes[0]!.id) : state.startKey,
        goalKey: action.graph.nodes.length > 1 ? (state.goalKey && action.graph.nodes.some((n) => n.id === state.goalKey) ? state.goalKey : action.graph.nodes[1]!.id) : state.goalKey,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setCustomExplanationPoints":
      return {
        ...state,
        customExplanationPoints: action.points
      };
    case "setAlgorithm":
      return resetPlayback({
        ...state,
        algorithm: action.algorithm,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setCompareOn":
      return resetPlayback({
        ...state,
        compareOn: action.on,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setCompareAlgorithm":
      return resetPlayback({
        ...state,
        compareAlgorithm: action.algorithm,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setHeuristic":
      return resetPlayback({
        ...state,
        heuristic: action.heuristic,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setHeuristicWeight":
      return resetPlayback({
        ...state,
        heuristicWeight: clamp(action.weight, 0, 10),
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "setLearningLevel":
      return { ...state, learningLevel: action.level };
    case "setExplainMode":
      return { ...state, explainMode: action.on };
    case "setDrawMode":
      return { ...state, drawMode: action.mode };
    case "applyEdit": {
      // Any grid edit invalidates trace.
      const base = {
        ...state,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null,
        isPlaying: false,
        stepIndex: 0
      };
      if (action.edit.kind === "wall") {
        if (state.environmentId !== "grid") return base;
        // Never allow wall on start/goal.
        if (action.edit.key === state.startKey || action.edit.key === state.goalKey)
          return base;
        const [xs, ys] = action.edit.key.split(",");
        const at = { x: Number(xs), y: Number(ys) };
        return { ...base, grid: setWall(state.grid, at, action.edit.on) };
      }
      if (action.edit.kind === "start") {
        if (action.edit.key === state.goalKey) return base;
        if (state.environmentId === "grid") {
          const [xs, ys] = action.edit.key.split(",");
          const at = { x: Number(xs), y: Number(ys) };
          return {
            ...base,
            startKey: action.edit.key,
            grid: setWall(state.grid, at, false)
          };
        }
        return { ...base, startKey: action.edit.key };
      }
      if (action.edit.key === state.startKey) return base;
      if (state.environmentId === "grid") {
        const [xs, ys] = action.edit.key.split(",");
        const at = { x: Number(xs), y: Number(ys) };
        return {
          ...base,
          goalKey: action.edit.key,
          grid: setWall(state.grid, at, false)
        };
      }
      return { ...base, goalKey: action.edit.key };
    }
    case "clearWalls":
      return resetPlayback({
        ...state,
        grid: state.environmentId === "grid" ? { ...state.grid, walls: new Set() } : state.grid,
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    case "randomWalls": {
      if (state.environmentId !== "grid") return resetPlayback({ ...state, trace: null, dna: null, compareTrace: null, compareDna: null });
      const walls = new Set<string>();
      const density = 0.18;
      for (let y = 0; y < state.grid.height; y++) {
        for (let x = 0; x < state.grid.width; x++) {
          const k = `${x},${y}`;
          if (k === state.startKey) continue;
          if (k === state.goalKey) continue;
          if (Math.random() < density) walls.add(k);
        }
      }
      return resetPlayback({
        ...state,
        grid: { ...state.grid, walls },
        trace: null,
        dna: null,
        compareTrace: null,
        compareDna: null
      });
    }
    default:
      return state;
  }
}

