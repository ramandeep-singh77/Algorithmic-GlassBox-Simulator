import React, { useMemo } from "react";
import type { AlgorithmId, FrontierItem, StepSnapshot } from "../../core/types";

type Props = Readonly<{
  algorithm: AlgorithmId;
  step: StepSnapshot | null;
}>;

function fmtItem(it: FrontierItem, algorithm: AlgorithmId): string {
  const p = `(${it.at.x},${it.at.y})`;
  if (algorithm === "bfs" || algorithm === "dfs") return `${p}  d=${it.depth ?? 0}`;
  if (algorithm === "dijkstra") return `${p}  g=${(it.g ?? 0).toFixed(1)}`;
  return `${p}  g=${(it.g ?? 0).toFixed(1)}  h=${(it.h ?? 0).toFixed(1)}  f=${(it.f ?? it.priority ?? 0).toFixed(1)}`;
}

export function DataStructurePanel({ algorithm, step }: Props) {
  const selectedKey = step?.selected?.key ?? null;

  const label = useMemo(() => {
    if (!step) return "—";
    if (step.frontierKind === "queue") return "Queue (FIFO)";
    if (step.frontierKind === "stack") return "Stack (LIFO)";
    return "Priority Queue (Min-Heap)";
  }, [step]);

  if (!step) {
    return (
      <div className="small">
        Run an algorithm to populate the live queue/stack/heap panel.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="kv">
        <div className="k">Frontier type</div>
        <div className="v">{label}</div>
        <div className="k">Frontier size</div>
        <div className="v mono">{step.frontier.length}</div>
        <div className="k">Visited</div>
        <div className="v mono">{step.visited.size}</div>
        <div className="k">Closed</div>
        <div className="v mono">{step.closed.size}</div>
      </div>

      <div className="small">
        {step.frontierKind === "minheap"
          ? "Heap view shows internal array order (reorders as priorities change)."
          : step.frontierKind === "queue"
            ? "Left-most is dequeued next."
            : "Right-most is popped next."}
      </div>

      <div className="dsList">
        {step.frontier.length === 0 ? (
          <span className="dsItem reason">Frontier empty</span>
        ) : (
          step.frontier.slice(0, 40).map((it, idx) => (
            <span
              key={`${it.key}-${idx}`}
              className={
                "dsItem" + (selectedKey === it.key ? " selected" : "")
              }
              title={it.key}
            >
              <span className="mono">{fmtItem(it, algorithm)}</span>
            </span>
          ))
        )}
        {step.frontier.length > 40 ? (
          <span className="dsItem reason">… +{step.frontier.length - 40} more</span>
        ) : null}
      </div>

      {step.relaxation ? (
        <div className="warning">
          Relaxation: <span className="mono">{step.relaxation.from}</span> →{" "}
          <span className="mono">{step.relaxation.to}</span>{" "}
          {step.relaxation.oldG === null ? (
            <span className="mono">(new g={step.relaxation.newG.toFixed(1)})</span>
          ) : (
            <span className="mono">
              (g {step.relaxation.oldG.toFixed(1)} → {step.relaxation.newG.toFixed(1)})
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

