import type { Coord, HeuristicId } from "./types";

export function heuristicFn(id: HeuristicId) {
  switch (id) {
    case "euclidean":
      return (a: Coord, b: Coord) => {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
      };
    case "manhattan":
    default:
      return (a: Coord, b: Coord) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}

