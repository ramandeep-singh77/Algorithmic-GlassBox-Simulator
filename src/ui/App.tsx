import React, { useEffect, useMemo, useReducer, useState } from "react";
import { GridCanvas } from "./components/GridCanvas";
import { GraphCanvas } from "./components/GraphCanvas";
import { GoogleMapsCanvas } from "./components/GoogleMapsCanvas";
import { CustomMapBuilder } from "./components/CustomMapBuilder";
import { ControlsPanel } from "./components/ControlsPanel";
import { DataStructurePanel } from "./components/DataStructurePanel";
import { MetricsPanel } from "./components/MetricsPanel";
import { NarrationPanel } from "./components/NarrationPanel";
import {
  DEFAULT_SIM,
  simulatorReducer,
  SimulatorAction,
  SimulatorState
} from "./state/simulator";
import { buildTrace } from "../core/engine/buildTrace";
import { AlgorithmId, HeuristicId, LearningLevel } from "../core/types";
import { computeAlgorithmDNA } from "../xai/dna";
import { getEnvironment } from "../core/environments/catalog";
import { coordOf } from "../core/grid";
import { createGraphFromRoute } from "../core/environments/realworld";

function runOnce(state: SimulatorState): SimulatorState {
  const baseEnv = getEnvironment(
    state.environmentId,
    state.environmentId === "custom" ? state.customGraph : undefined,
    state.environmentId === "custom" ? state.customExplanationPoints : undefined,
    state.environmentId === "realworld" && state.realWorldStart ? state.realWorldStart : undefined,
    state.environmentId === "realworld" && state.realWorldGoal ? state.realWorldGoal : undefined,
    state.environmentId === "realworld" ? state.realWorldGraph : undefined
  );
  const env = baseEnv.kind === "grid" ? { ...baseEnv, grid: state.grid } : baseEnv;

  const trace = buildTrace(env, state.startKey, state.goalKey, {
    environmentId: state.environmentId,
    algorithm: state.algorithm,
    heuristic: state.heuristic,
    heuristicWeight: state.heuristicWeight,
    diagonal: false
  });

  const dna = computeAlgorithmDNA(trace, state.algorithm);
  const compareTrace = state.compareOn
    ? buildTrace(env, state.startKey, state.goalKey, {
        environmentId: state.environmentId,
        algorithm: state.compareAlgorithm,
        heuristic: state.heuristic,
        heuristicWeight: state.heuristicWeight,
        diagonal: false
      })
    : null;
  const compareDna = compareTrace
    ? computeAlgorithmDNA(compareTrace, state.compareAlgorithm)
    : null;
  return {
    ...state,
    trace,
    dna,
    compareTrace,
    compareDna,
    stepIndex: 0,
    isPlaying: false
  };
}

export function App() {
  const [state, dispatch] = useReducer(simulatorReducer, DEFAULT_SIM);

  const baseEnv = useMemo(
    () =>
      getEnvironment(
        state.environmentId,
        state.environmentId === "custom" ? state.customGraph : undefined,
        state.environmentId === "custom" ? state.customExplanationPoints : undefined,
        state.environmentId === "realworld" && state.realWorldStart ? state.realWorldStart : undefined,
        state.environmentId === "realworld" && state.realWorldGoal ? state.realWorldGoal : undefined,
        state.environmentId === "realworld" ? state.realWorldGraph : undefined
      ),
    [
      state.environmentId,
      state.customGraph,
      state.customExplanationPoints,
      state.realWorldStart,
      state.realWorldGoal,
      state.realWorldGraph
    ]
  );
  const env = useMemo(() => {
    return baseEnv.kind === "grid" ? { ...baseEnv, grid: state.grid } : baseEnv;
  }, [baseEnv, state.grid]);

  const isGrid = env.kind === "grid";
  const isRealWorld = env.kind === "map";
  const startCoord = useMemo(() => (isGrid ? coordOf(state.startKey) : null), [isGrid, state.startKey]);
  const goalCoord = useMemo(() => (isGrid ? coordOf(state.goalKey) : null), [isGrid, state.goalKey]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const currentStep = useMemo(() => {
    return state.trace?.steps[state.stepIndex] ?? null;
  }, [state.trace, state.stepIndex]);

  const compareStep = useMemo(() => {
    return state.compareTrace?.steps[state.stepIndex] ?? null;
  }, [state.compareTrace, state.stepIndex]);

  // Side-effect-ish reducer actions kept minimal: we compute trace here.
  const enhancedDispatch = (action: SimulatorAction) => {
    if (action.type === "run") {
      const next = runOnce(state);
      dispatch({ type: "hydrateAfterRun", next });
      return;
    }
    dispatch(action);
  };

  // Fetch route when both start and goal are set for real-world map
  useEffect(() => {
    if (
      state.environmentId === "realworld" &&
      state.realWorldStart &&
      state.realWorldGoal &&
      window.google &&
      state.realWorldGraph.nodes.length === 0
    ) {
      setIsLoadingRoute(true);
      createGraphFromRoute(state.realWorldStart, state.realWorldGoal)
        .then(({ graph, startKey, goalKey }) => {
          dispatch({ type: "setRealWorldGraph", graph });
          dispatch({ type: "applyEdit", edit: { kind: "start", key: startKey } });
          dispatch({ type: "applyEdit", edit: { kind: "goal", key: goalKey } });
          setIsLoadingRoute(false);
        })
        .catch((err) => {
          console.error("Failed to fetch route:", err);
          setIsLoadingRoute(false);
        });
    }
  }, [state.environmentId, state.realWorldStart, state.realWorldGoal, state.realWorldGraph.nodes.length]);

  useEffect(() => {
    if (!state.isPlaying || !state.trace) return;
    const id = window.setInterval(() => {
      dispatch({ type: "step", direction: 1 });
    }, state.speedMs);
    return () => window.clearInterval(id);
  }, [state.isPlaying, state.trace, state.speedMs]);

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="title">Glass Box Pathfinding Simulator</div>
          <div className="subtitle">
            Step-by-step BFS / DFS / Dijkstra / A* with live introspection +
            explainable narration
          </div>
        </div>
        <span className="pill">
          <span className="mono">{env.name}</span>
          {isGrid ? (
            <span className="mono">
              {state.grid.width}×{state.grid.height}
            </span>
          ) : null}
        </span>
      </div>

      <div className="panel">
        <div className="panelHeader">
          <div className="panelTitle">{isGrid ? "Grid" : "Map"}</div>
          <div className="controlsRow">
            <span className="pill">
              <span className="mono">Mode</span>
              <span className="mono">{state.drawMode}</span>
            </span>
          </div>
        </div>
        <div className="gridWrap">
          {isRealWorld ? (
            <GoogleMapsCanvas
              startLatLng={state.realWorldStart}
              goalLatLng={state.realWorldGoal}
              step={currentStep}
              finalPath={state.trace?.path}
              drawMode={state.drawMode}
              onStartChange={(lat, lng) =>
                enhancedDispatch({ type: "setRealWorldStart", lat, lng })
              }
              onGoalChange={(lat, lng) =>
                enhancedDispatch({ type: "setRealWorldGoal", lat, lng })
              }
            />
          ) : state.compareOn ? (
            <div className="twoCol">
              <div className="panel" style={{ background: "transparent", border: "none" }}>
                <div className="panelHeader" style={{ borderRadius: 14 }}>
                  <div className="panelTitle">{state.algorithm.toUpperCase()}</div>
                </div>
                <div className="panelBody" style={{ padding: 10 }}>
                  {isGrid && startCoord && goalCoord ? (
                    <GridCanvas
                      grid={state.grid}
                      start={startCoord}
                      goal={goalCoord}
                      step={currentStep}
                      drawMode={state.drawMode}
                      onEdit={(edit) => enhancedDispatch({ type: "applyEdit", edit })}
                    />
                  ) : (
                    <GraphCanvas
                      graph={env.graph!}
                      startKey={state.startKey}
                      goalKey={state.goalKey}
                      step={currentStep}
                      drawMode={state.drawMode}
                      onEdit={(edit) => enhancedDispatch({ type: "applyEdit", edit })}
                      explanationPoints={env.explanationPoints}
                    />
                  )}
                </div>
              </div>
              <div className="panel" style={{ background: "transparent", border: "none" }}>
                <div className="panelHeader" style={{ borderRadius: 14 }}>
                  <div className="panelTitle">{state.compareAlgorithm.toUpperCase()}</div>
                </div>
                <div className="panelBody" style={{ padding: 10 }}>
                  {isGrid && startCoord && goalCoord ? (
                    <GridCanvas
                      grid={state.grid}
                      start={startCoord}
                      goal={goalCoord}
                      step={compareStep}
                      drawMode={state.drawMode}
                      onEdit={(edit) => enhancedDispatch({ type: "applyEdit", edit })}
                    />
                  ) : (
                    <GraphCanvas
                      graph={env.graph!}
                      startKey={state.startKey}
                      goalKey={state.goalKey}
                      step={compareStep}
                      drawMode={state.drawMode}
                      onEdit={(edit) => enhancedDispatch({ type: "applyEdit", edit })}
                      explanationPoints={env.explanationPoints}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {isGrid && startCoord && goalCoord ? (
                <GridCanvas
                  grid={state.grid}
                  start={startCoord}
                  goal={goalCoord}
                  step={currentStep}
                  drawMode={state.drawMode}
                  onEdit={(edit) => enhancedDispatch({ type: "applyEdit", edit })}
                />
              ) : (
                <GraphCanvas
                  graph={env.graph!}
                  startKey={state.startKey}
                  goalKey={state.goalKey}
                  step={currentStep}
                  drawMode={state.drawMode}
                  onEdit={(edit) => enhancedDispatch({ type: "applyEdit", edit })}
                  explanationPoints={env.explanationPoints}
                />
              )}
            </>
          )}
          {isLoadingRoute && (
            <div className="warning" style={{ marginTop: 10 }}>
              Loading route from Google Maps...
            </div>
          )}
        </div>
      </div>

      {state.environmentId === "custom" && (
        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Custom Map Builder</div>
          </div>
          <div className="panelBody">
            <CustomMapBuilder
              graph={state.customGraph}
              onGraphChange={(g) => enhancedDispatch({ type: "setCustomGraph", graph: g })}
              onExplanationPointsChange={(p) =>
                enhancedDispatch({ type: "setCustomExplanationPoints", points: p })
              }
              explanationPoints={state.customExplanationPoints}
            />
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Controls</div>
          </div>
          <div className="panelBody">
            <ControlsPanel
              environmentId={state.environmentId}
              isGrid={isGrid}
              algorithm={state.algorithm}
              compareOn={state.compareOn}
              compareAlgorithm={state.compareAlgorithm}
              heuristic={state.heuristic}
              heuristicWeight={state.heuristicWeight}
              learningLevel={state.learningLevel}
              explainMode={state.explainMode}
              isPlaying={state.isPlaying}
              speedMs={state.speedMs}
              hasTrace={Boolean(state.trace)}
              stepIndex={state.stepIndex}
              stepCount={state.trace?.steps.length ?? 0}
              onEnvironmentChange={(id) =>
                enhancedDispatch({ type: "setEnvironment", environmentId: id })
              }
              onAlgorithmChange={(a: AlgorithmId) =>
                enhancedDispatch({ type: "setAlgorithm", algorithm: a })
              }
              onCompareOnChange={(on: boolean) =>
                enhancedDispatch({ type: "setCompareOn", on })
              }
              onCompareAlgorithmChange={(a: AlgorithmId) =>
                enhancedDispatch({ type: "setCompareAlgorithm", algorithm: a })
              }
              onHeuristicChange={(h: HeuristicId) =>
                enhancedDispatch({ type: "setHeuristic", heuristic: h })
              }
              onHeuristicWeightChange={(w: number) =>
                enhancedDispatch({ type: "setHeuristicWeight", weight: w })
              }
              onLearningLevelChange={(lvl: LearningLevel) =>
                enhancedDispatch({ type: "setLearningLevel", level: lvl })
              }
              onExplainModeChange={(on: boolean) =>
                enhancedDispatch({ type: "setExplainMode", on })
              }
              onSpeedChange={(ms: number) =>
                enhancedDispatch({ type: "setSpeed", ms })
              }
              onRun={() => enhancedDispatch({ type: "run" })}
              onPlayPause={() => enhancedDispatch({ type: "togglePlay" })}
              onStep={(dir) =>
                enhancedDispatch({ type: "step", direction: dir })
              }
              onReset={() => enhancedDispatch({ type: "resetTrace" })}
              onClearWalls={() => enhancedDispatch({ type: "clearWalls" })}
              onRandomWalls={() => enhancedDispatch({ type: "randomWalls" })}
              onSetDrawMode={(m) =>
                enhancedDispatch({ type: "setDrawMode", mode: m })
              }
            />
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Live Introspection</div>
          </div>
          <div className="panelBody">
            {state.compareOn ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div className="small">{state.algorithm.toUpperCase()}</div>
                  <DataStructurePanel algorithm={state.algorithm} step={currentStep} />
                </div>
                <div>
                  <div className="small">{state.compareAlgorithm.toUpperCase()}</div>
                  <DataStructurePanel algorithm={state.compareAlgorithm} step={compareStep} />
                </div>
              </div>
            ) : (
              <DataStructurePanel algorithm={state.algorithm} step={currentStep} />
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Narration</div>
          </div>
          <div className="panelBody">
            <NarrationPanel
              algorithm={state.algorithm}
              step={currentStep}
              trace={state.trace}
              stepIndex={state.stepIndex}
              explainMode={state.explainMode}
              learningLevel={state.learningLevel}
              dna={state.dna}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Metrics</div>
          </div>
          <div className="panelBody">
            <MetricsPanel
              algorithm={state.algorithm}
              step={currentStep}
              trace={state.trace}
              dna={state.dna}
              compareAlgorithm={state.compareAlgorithm}
              compareTrace={state.compareTrace}
              compareDna={state.compareDna}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

