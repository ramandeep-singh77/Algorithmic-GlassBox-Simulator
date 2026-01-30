import React from "react";
import type { AlgorithmId, LearningLevel, StepSnapshot, Trace } from "../../core/types";
import type { AlgorithmDNA } from "../../xai/dna";
import { narrateStep } from "../../xai/narrator";

type Props = Readonly<{
  algorithm: AlgorithmId;
  step: StepSnapshot | null;
  trace: Trace | null;
  stepIndex: number;
  explainMode: boolean;
  learningLevel: LearningLevel;
  dna: AlgorithmDNA | null;
}>;

export function NarrationPanel({
  algorithm,
  step,
  trace,
  stepIndex,
  explainMode,
  learningLevel,
  dna
}: Props) {
  const n = narrateStep({
    algorithm,
    step,
    trace,
    stepIndex,
    explainMode,
    learningLevel
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <div className="pill">
          <span className="mono">{n.title}</span>
        </div>
      </div>
      <div className="narration">{n.text}</div>

      {n.whyNot.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div className="small">Why not the other nodes?</div>
          {n.whyNot.map((line, i) => (
            <div key={i} className="warning">
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {dna && trace?.steps[trace.steps.length - 1]?.phase ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div className="small">Algorithm DNA (post-run)</div>
          {dna.fingerprint.map((f, i) => (
            <div key={i} className="warning">
              {f}
            </div>
          ))}
          {dna.notes.length ? (
            <div style={{ display: "grid", gap: 6 }}>
              <div className="small">Notable behaviors</div>
              {dna.notes.slice(0, 3).map((w, i) => (
                <div key={i} className="warning">
                  {w}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

