import type { Coord, Grid } from "./types";

export function keyOf(c: Coord): string {
  return `${c.x},${c.y}`;
}

export function coordOf(key: string): Coord {
  const [xs, ys] = key.split(",");
  return { x: Number(xs), y: Number(ys) };
}

export function inBounds(grid: Grid, c: Coord): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < grid.width && c.y < grid.height;
}

export function isWall(grid: Grid, c: Coord): boolean {
  return grid.walls.has(keyOf(c));
}

export function setWall(grid: Grid, c: Coord, on: boolean): Grid {
  const next = new Set(grid.walls);
  const k = keyOf(c);
  if (on) next.add(k);
  else next.delete(k);
  return { ...grid, walls: next };
}

export function emptyGrid(width: number, height: number): Grid {
  return { width, height, walls: new Set() };
}

export function neighbors4(c: Coord): Coord[] {
  return [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x, y: c.y - 1 }
  ];
}

export function costBetween(_a: Coord, _b: Coord): number {
  // Uniform grid for demo; easy to extend to weighted terrain later.
  return 1;
}

export function reconstructPath(
  cameFrom: ReadonlyMap<string, string>,
  startKey: string,
  goalKey: string
): Coord[] {
  if (startKey === goalKey) return [coordOf(startKey)];
  if (!cameFrom.has(goalKey)) return [];

  const out: string[] = [];
  let cur = goalKey;
  out.push(cur);
  while (cur !== startKey) {
    const prev = cameFrom.get(cur);
    if (!prev) break;
    cur = prev;
    out.push(cur);
  }
  out.reverse();
  return out.map(coordOf);
}

