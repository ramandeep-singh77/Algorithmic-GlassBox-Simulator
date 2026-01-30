export type AlgorithmId = "bfs" | "dfs" | "dijkstra" | "astar";
export type HeuristicId = "manhattan" | "euclidean";
export type LearningLevel = "beginner" | "intermediate" | "advanced";

export type DrawMode = "walls" | "erase" | "start" | "goal";

export type Coord = Readonly<{ x: number; y: number }>;
export type LatLng = Readonly<{ lat: number; lng: number }>;

export type EnvironmentId = "grid" | "city" | "campus" | "dungeon" | "custom" | "realworld";
export type EnvironmentKind = "grid" | "graph" | "map";

export type Grid = Readonly<{
  width: number;
  height: number;
  walls: ReadonlySet<string>; // key = "x,y"
}>;

export type GraphNode = Readonly<{
  id: string;
  at: Coord;
  label?: string;
  explanation?: string; // Explanation point for this node
}>;

export type GraphEdge = Readonly<{
  from: string;
  to: string;
  cost: number;
}>;

export type Graph = Readonly<{
  directed: boolean;
  nodes: ReadonlyArray<GraphNode>;
  edges: ReadonlyArray<GraphEdge>;
}>;

export type Environment = Readonly<{
  id: EnvironmentId;
  name: string;
  kind: EnvironmentKind;
  grid?: Grid;
  graph?: Graph;
  defaultStartKey: string;
  defaultGoalKey: string;
  explanationPoints?: ReadonlyArray<{ at: Coord; text: string }>; // Additional explanation points on the map
}>;

export type RunOptions = Readonly<{
  environmentId: EnvironmentId;
  algorithm: AlgorithmId;
  heuristic: HeuristicId;
  heuristicWeight: number; // A* only; 1 = standard, >1 = greedier (may be suboptimal)
  diagonal: boolean;
}>;

export type FrontierKind = "queue" | "stack" | "minheap";

export type FrontierItem = Readonly<{
  key: string;
  at: Coord;
  // The following are algorithm-specific; narrator uses what exists.
  g?: number;
  h?: number;
  f?: number;
  depth?: number;
  priority?: number; // for heap visualization, normally = f or g
}>;

export type RelaxationEvent = Readonly<{
  from: string;
  to: string;
  oldG: number | null;
  newG: number;
  improved: boolean;
}>;

export type SelectionReason =
  | Readonly<{ kind: "fifo" }>
  | Readonly<{ kind: "lifo" }>
  | Readonly<{ kind: "min"; metric: "g" | "f"; value: number }>
  | Readonly<{ kind: "goal" }>;

export type RejectionReason = Readonly<{
  candidate: FrontierItem;
  chosen: FrontierItem;
  metric: "g" | "f" | "depth";
  candidateValue: number;
  chosenValue: number;
}>;

export type StepSnapshot = Readonly<{
  index: number;
  phase:
    | "init"
    | "select"
    | "expand"
    | "relax"
    | "enqueue"
    | "found"
    | "exhausted";
  currentKey: string | null;
  current?: Coord;
  frontierKind: FrontierKind;
  frontier: ReadonlyArray<FrontierItem>;
  selected?: FrontierItem;
  visited: ReadonlySet<string>;
  closed: ReadonlySet<string>;
  cameFrom: ReadonlyMap<string, string>;
  gScore: ReadonlyMap<string, number>;
  relaxation?: RelaxationEvent;
  selectionReason?: SelectionReason;
  whyNot?: ReadonlyArray<RejectionReason>;
  path?: ReadonlyArray<Coord>;
  warnings?: ReadonlyArray<string>;
}>;

export type Trace = Readonly<{
  options: RunOptions;
  steps: ReadonlyArray<StepSnapshot>;
  found: boolean;
  path: ReadonlyArray<Coord>;
  metrics: Readonly<{
    explored: number;
    relaxations: number;
    peakFrontier: number;
    peakClosed: number;
    runtimeSteps: number;
  }>;
}>;

