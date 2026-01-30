import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Coord, DrawMode, Grid, StepSnapshot } from "../../core/types";
import { keyOf } from "../../core/grid";

type Props = Readonly<{
  grid: Grid;
  start: Coord;
  goal: Coord;
  step: StepSnapshot | null;
  drawMode: DrawMode;
  onEdit: (
    edit:
      | { kind: "wall"; key: string; on: boolean }
      | { kind: "start"; key: string }
      | { kind: "goal"; key: string }
  ) => void;
}>;

function getCSSVar(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v.trim() || "#ffffff";
}

function eventToCell(
  e: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  cellSize: number
): Coord | null {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  if (cx < 0 || cy < 0) return null;
  return { x: cx, y: cy };
}

export function GridCanvas({ grid, start, goal, step, drawMode, onEdit }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cellSize, setCellSize] = useState(26);

  const [isDown, setIsDown] = useState(false);
  const [paintOn, setPaintOn] = useState(true);

  const frontierKeys = useMemo(() => {
    const s = new Set<string>();
    for (const it of step?.frontier ?? []) s.add(it.key);
    return s;
  }, [step]);

  const pathKeys = useMemo(() => {
    const s = new Set<string>();
    for (const c of step?.path ?? []) s.add(keyOf(c));
    return s;
  }, [step]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const compute = () => {
      // Fit grid width into container (minus a little padding), but keep it readable.
      const available = Math.max(200, el.clientWidth - 6);
      const ideal = Math.floor(available / grid.width);
      const next = Math.max(14, Math.min(26, ideal));
      setCellSize(next);
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [grid.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = grid.width * cellSize * dpr;
    canvas.height = grid.height * cellSize * dpr;
    canvas.style.width = `${grid.width * cellSize}px`;
    canvas.style.height = `${grid.height * cellSize}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = {
      empty: getCSSVar("--gridEmpty"),
      gridLine: getCSSVar("--gridLine"),
      wall: getCSSVar("--cellWall"),
      visited: getCSSVar("--cellVisited"),
      frontier: getCSSVar("--cellFrontier"),
      current: getCSSVar("--cellCurrent"),
      path: getCSSVar("--cellPath"),
      accent: getCSSVar("--accent"),
      good: getCSSVar("--good"),
      bad: getCSSVar("--bad")
    };

    // Background
    ctx.clearRect(0, 0, grid.width * cellSize, grid.height * cellSize);
    ctx.fillStyle = colors.empty;
    ctx.fillRect(0, 0, grid.width * cellSize, grid.height * cellSize);

    // Precompute state sets
    const visited = step?.visited ?? new Set<string>();
    const closed = step?.closed ?? new Set<string>();
    const currentKey = step?.currentKey ?? null;

    // Cells
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const k = `${x},${y}`;
        let fill: string | null = null;

        if (grid.walls.has(k)) fill = colors.wall;
        if (visited.has(k)) fill = colors.visited;
        if (frontierKeys.has(k)) fill = colors.frontier;
        if (pathKeys.has(k)) fill = colors.path;
        if (closed.has(k)) fill = fill ?? colors.visited;
        if (currentKey === k) fill = colors.current;

        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // Start/Goal markers
    const drawMarker = (c: Coord, fill: string, label: string) => {
      const px = c.x * cellSize;
      const py = c.y * cellSize;
      ctx.fillStyle = fill;
      ctx.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.font = "bold 12px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, px + cellSize / 2, py + cellSize / 2);
    };
    drawMarker(start, colors.good, "S");
    drawMarker(goal, colors.bad, "G");

    // Grid lines
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= grid.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize + 0.5, 0);
      ctx.lineTo(x * cellSize + 0.5, grid.height * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= grid.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize + 0.5);
      ctx.lineTo(grid.width * cellSize, y * cellSize + 0.5);
      ctx.stroke();
    }
  }, [grid, start, goal, step, frontierKeys, pathKeys]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const cell = eventToCell(e, canvas, cellSize);
    if (!cell) return;
    if (cell.x >= grid.width || cell.y >= grid.height) return;

    setIsDown(true);

    if (drawMode === "walls") {
      const k = keyOf(cell);
      const on = !grid.walls.has(k);
      setPaintOn(on);
      onEdit({ kind: "wall", key: k, on });
      return;
    }
    if (drawMode === "erase") {
      setPaintOn(false);
      onEdit({ kind: "wall", key: keyOf(cell), on: false });
      return;
    }
    if (drawMode === "start") {
      onEdit({ kind: "start", key: keyOf(cell) });
      return;
    }
    onEdit({ kind: "goal", key: keyOf(cell) });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDown) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cell = eventToCell(e, canvas, cellSize);
    if (!cell) return;
    if (cell.x >= grid.width || cell.y >= grid.height) return;
    if (drawMode === "walls" || drawMode === "erase") {
      onEdit({ kind: "wall", key: keyOf(cell), on: paintOn });
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    setIsDown(false);
  };

  return (
    <div ref={wrapRef}>
      <div className="controlsRow" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <span className="small">
          Draw walls, set start/goal, then run and step through decisions.
        </span>
        {step?.warnings?.length ? (
          <span className="pill" style={{ borderColor: "rgba(255,212,59,0.35)" }}>
            <span className="mono">⚠</span>
            <span className="mono">{step.warnings[0]}</span>
          </span>
        ) : null}
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          touchAction: "none",
          display: "block"
        }}
      />
    </div>
  );
}

