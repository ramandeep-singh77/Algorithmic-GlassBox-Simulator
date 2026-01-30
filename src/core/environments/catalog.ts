import type { Coord, Environment, EnvironmentId, Graph, LatLng } from "../types";
import { emptyGrid } from "../grid";

function dist(a: Coord, b: Coord) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function makeUndirectedEdges(nodes: Record<string, Coord>, pairs: Array<[string, string]>, scale = 1) {
  const edges: Array<{ from: string; to: string; cost: number }> = [];
  for (const [a, b] of pairs) {
    const ca = nodes[a];
    const cb = nodes[b];
    if (!ca || !cb) {
      console.warn(`Missing node: ${a} or ${b}`);
      continue;
    }
    const c = dist(ca, cb) * scale;
    edges.push({ from: a, to: b, cost: c }, { from: b, to: a, cost: c });
  }
  return edges;
}

const CITY_GRAPH: Graph = (() => {
  // A larger city road network with ~144 nodes in a grid-like pattern with highways
  const nodes: Record<string, Coord> = {};
  const pairs: Array<[string, string]> = [];
  
  // Create a 12x12 grid of intersections (144 nodes)
  const gridSize = 12;
  const spacing = 7;
  const startX = 5;
  const startY = 5;
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const id = `N${row}_${col}`;
      nodes[id] = { x: startX + col * spacing, y: startY + row * spacing };
      
      // Connect horizontally (streets)
      if (col < gridSize - 1) {
        pairs.push([id, `N${row}_${col + 1}`]);
      }
      // Connect vertically (avenues)
      if (row < gridSize - 1) {
        pairs.push([id, `N${row + 1}_${col}`]);
      }
    }
  }
  
  // Add diagonal highways for faster routes (weighted lower)
  for (let i = 0; i < gridSize - 1; i++) {
    // Main diagonal highway
    pairs.push([`N${i}_${i}`, `N${i + 1}_${i + 1}`]);
    // Cross highways - only add if indices are valid
    if (i < gridSize - 2 && i >= 1) {
      pairs.push([`N${i}_${i + 1}`, `N${i + 1}_${i}`]);
    }
  }
  
  // Add some long-range shortcuts
  pairs.push(["N0_0", "N5_5"], ["N5_5", "N11_11"]);
  pairs.push(["N0_11", "N5_6"], ["N5_6", "N11_0"]);
  
  const edges = makeUndirectedEdges(nodes, pairs, 1);
  
  // Make highway edges cheaper (faster routes)
  for (const e of edges) {
    const fromParts = e.from.split("_");
    const toParts = e.to.split("_");
    if (fromParts.length === 2 && toParts.length === 2) {
      const fromRow = parseInt(fromParts[0].substring(1));
      const fromCol = parseInt(fromParts[1]);
      const toRow = parseInt(toParts[0].substring(1));
      const toCol = parseInt(toParts[1]);
      
      // Diagonal connections are highways (cheaper)
      if (Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 1) {
        e.cost *= 0.6;
      }
      // Long-range shortcuts are super-highways
      if (Math.abs(fromRow - toRow) > 3 || Math.abs(fromCol - toCol) > 3) {
        e.cost *= 0.4;
      }
    }
  }

  return {
    directed: false,
    nodes: Object.entries(nodes).map(([id, at]) => ({ 
      id, 
      at, 
      label: id === "N0_0" ? "Start" : id === "N11_11" ? "Goal" : undefined 
    })),
    edges
  };
})();

const CAMPUS_GRAPH: Graph = (() => {
  // A larger campus with ~120 nodes: buildings, pathways, and courtyards
  const nodes: Record<string, Coord> = {};
  const pairs: Array<[string, string]> = [];
  
  // Create building clusters and pathways
  const buildings = [
    { name: "Dorm", x: 10, y: 70 },
    { name: "Cafe", x: 25, y: 60 },
    { name: "Library", x: 40, y: 65 },
    { name: "Gym", x: 55, y: 70 },
    { name: "Lab", x: 70, y: 55 },
    { name: "Quad", x: 50, y: 45 },
    { name: "Admin", x: 35, y: 35 },
    { name: "Lecture", x: 60, y: 30 },
    { name: "Parking", x: 15, y: 25 }
  ];
  
  // Add main buildings
  buildings.forEach(b => {
    nodes[b.name] = { x: b.x, y: b.y };
  });
  
  // Create pathway network around buildings
  let nodeId = 0;
  const pathwayNodes: string[] = [];
  
  // Generate pathways between buildings (creates many intermediate nodes)
  for (let i = 0; i < buildings.length; i++) {
    for (let j = i + 1; j < buildings.length; j++) {
      const b1 = buildings[i]!;
      const b2 = buildings[j]!;
      const dist = Math.sqrt((b1.x - b2.x) ** 2 + (b1.y - b2.y) ** 2);
      
      // Create intermediate pathway nodes for longer routes
      if (dist > 20) {
        const steps = Math.floor(dist / 8);
        let prevNode = b1.name;
        
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const pathId = `P${nodeId++}`;
          nodes[pathId] = {
            x: b1.x + (b2.x - b1.x) * t,
            y: b1.y + (b2.y - b1.y) * t
          };
          pathwayNodes.push(pathId);
          pairs.push([prevNode, pathId]);
          prevNode = pathId;
        }
        pairs.push([prevNode, b2.name]);
      } else {
        pairs.push([b1.name, b2.name]);
      }
    }
  }
  
  // Add courtyard connections (shortcuts)
  const quad = buildings.find(b => b.name === "Quad")!;
  const nearby = buildings.filter(b => {
    const d = Math.sqrt((b.x - quad.x) ** 2 + (b.y - quad.y) ** 2);
    return d < 25 && b.name !== "Quad";
  });
  
  nearby.forEach(b => {
    pairs.push(["Quad", b.name]);
  });
  
  // Add some random pathway connections for realism
  for (let i = 0; i < pathwayNodes.length - 1; i++) {
    if (Math.random() > 0.7) {
      pairs.push([pathwayNodes[i]!, pathwayNodes[i + 1]!]);
    }
  }
  
  const edges = makeUndirectedEdges(nodes, pairs, 1);
  
  // Add cost penalties for crowded paths
  for (const e of edges) {
    if ((e.from === "Cafe" && e.to === "Library") || (e.from === "Library" && e.to === "Cafe")) {
      e.cost *= 1.5;
    }
    // Pathways through quad are faster
    if (e.from === "Quad" || e.to === "Quad") {
      e.cost *= 0.8;
    }
  }

  return {
    directed: false,
    nodes: Object.entries(nodes).map(([id, at]) => ({ 
      id, 
      at, 
      label: id === "Dorm" ? "Start" : id === "Lab" ? "Goal" : id.startsWith("P") ? undefined : id 
    })),
    edges
  };
})();

const DUNGEON_GRAPH: Graph = (() => {
  // A larger dungeon/maze with ~180 nodes: main corridors, branches, and dead-ends
  const nodes: Record<string, Coord> = {};
  const pairs: Array<[string, string]> = [];
  
  // Main corridor (horizontal, ~80 nodes)
  const mainCorridorLength = 80;
  const startX = 5;
  const startY = 50;
  
  nodes["S"] = { x: startX, y: startY };
  let prevNode = "S";
  
  for (let i = 1; i < mainCorridorLength; i++) {
    const nodeId = `M${i}`;
    nodes[nodeId] = { x: startX + i, y: startY };
    pairs.push([prevNode, nodeId]);
    prevNode = nodeId;
  }
  
  nodes["G"] = { x: startX + mainCorridorLength, y: startY };
  pairs.push([prevNode, "G"]);
  
  // Add side branches (dead-ends and loops)
  let branchId = 0;
  const branchPoints = [10, 20, 30, 40, 50, 60, 70]; // Where branches connect to main corridor
  
  branchPoints.forEach((mainIdx) => {
    // Create 2-3 branches per connection point
    for (let b = 0; b < 2; b++) {
      const branchLength = 5 + Math.floor(Math.random() * 8);
      const branchStart = `M${mainIdx}`;
      let prevBranchNode = branchStart;
      const vertical = Math.random() > 0.5;
      
      for (let i = 1; i <= branchLength; i++) {
        const branchNodeId = `B${branchId}_${i}`;
        const offset = vertical ? { x: 0, y: (b % 2 === 0 ? -1 : 1) * i * 3 } : { x: (b % 2 === 0 ? -1 : 1) * i * 3, y: 0 };
        nodes[branchNodeId] = {
          x: nodes[branchStart]!.x + offset.x,
          y: nodes[branchStart]!.y + offset.y
        };
        pairs.push([prevBranchNode, branchNodeId]);
        prevBranchNode = branchNodeId;
      }
      branchId++;
    }
  });
  
  // Add some connecting passages (create loops)
  const connections = [
    ["M15", "M45"],
    ["M25", "M55"],
    ["M35", "M65"]
  ];
  
  connections.forEach(([from, to]) => {
    if (nodes[from] && nodes[to]) {
      // Create intermediate nodes for the connecting passage
      const steps = 8;
      let prevConn = from;
      for (let i = 1; i < steps; i++) {
        const connId = `C${from}_${to}_${i}`;
        const t = i / steps;
        nodes[connId] = {
          x: nodes[from]!.x + (nodes[to]!.x - nodes[from]!.x) * t + (Math.random() - 0.5) * 5,
          y: nodes[from]!.y + (nodes[to]!.y - nodes[from]!.y) * t + (Math.random() - 0.5) * 5
        };
        pairs.push([prevConn, connId]);
        prevConn = connId;
      }
      pairs.push([prevConn, to]);
    }
  });
  
  const edges = makeUndirectedEdges(nodes, pairs, 1);
  
  return {
    directed: false,
    nodes: Object.entries(nodes).map(([id, at]) => ({ 
      id, 
      at, 
      label: id === "S" ? "Start" : id === "G" ? "Goal" : undefined 
    })),
    edges
  };
})();

export function getEnvironment(
  id: EnvironmentId,
  customGraph?: Graph,
  customExplanationPoints?: ReadonlyArray<{ at: Coord; text: string }>
): Environment {
  switch (id) {
    case "city":
      return {
        id,
        name: "City Map (Road Network)",
        kind: "graph",
        graph: CITY_GRAPH,
        defaultStartKey: "N0_0",
        defaultGoalKey: "N11_11"
      };
    case "campus":
      return {
        id,
        name: "Campus Map (Buildings + Paths)",
        kind: "graph",
        graph: CAMPUS_GRAPH,
        defaultStartKey: "Dorm",
        defaultGoalKey: "Lab"
      };
    case "dungeon":
      return {
        id,
        name: "Dungeon Layout (Maze Graph)",
        kind: "graph",
        graph: DUNGEON_GRAPH,
        defaultStartKey: "S",
        defaultGoalKey: "G"
      };
    case "custom":
      return {
        id,
        name: "Custom Map",
        kind: "graph",
        graph: customGraph ?? { directed: true, nodes: [], edges: [] },
        defaultStartKey: customGraph?.nodes[0]?.id ?? "A",
        defaultGoalKey: customGraph?.nodes[1]?.id ?? "B",
        explanationPoints: customExplanationPoints
      };
    case "grid":
    default: {
      const grid = emptyGrid(28, 18);
      return {
        id: "grid",
        name: "Abstract Grid",
        kind: "grid",
        grid,
        defaultStartKey: "2,2",
        defaultGoalKey: "24,14"
      };
    }
  }
}
