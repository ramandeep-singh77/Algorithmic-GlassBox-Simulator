import React from "react";
import type { AlgorithmId, DrawMode, EnvironmentId, HeuristicId, LearningLevel } from "../../core/types";

type Props = Readonly<{
  environmentId: EnvironmentId;
  isGrid: boolean;
  algorithm: AlgorithmId;
  compareOn: boolean;
  compareAlgorithm: AlgorithmId;
  heuristic: HeuristicId;
  heuristicWeight: number;
  learningLevel: LearningLevel;
  explainMode: boolean;
  isPlaying: boolean;
  speedMs: number;
  hasTrace: boolean;
  stepIndex: number;
  stepCount: number;

  onEnvironmentChange: (id: EnvironmentId) => void;
  onAlgorithmChange: (a: AlgorithmId) => void;
  onCompareOnChange: (on: boolean) => void;
  onCompareAlgorithmChange: (a: AlgorithmId) => void;
  onHeuristicChange: (h: HeuristicId) => void;
  onHeuristicWeightChange: (w: number) => void;
  onLearningLevelChange: (lvl: LearningLevel) => void;
  onExplainModeChange: (on: boolean) => void;
  onSpeedChange: (ms: number) => void;

  onRun: () => void;
  onPlayPause: () => void;
  onStep: (dir: -1 | 1) => void;
  onReset: () => void;
  onClearWalls: () => void;
  onRandomWalls: () => void;
  onSetDrawMode: (m: DrawMode) => void;
}>;

export function ControlsPanel(props: Props) {
  const isAStar = props.algorithm === "astar";
  const isDijkstra = props.algorithm === "dijkstra";

  const stepLabel = props.hasTrace ? `${props.stepIndex + 1} / ${props.stepCount}` : "—";

  return (
    <div className="controls-container">
      {/* Playback Controls */}
      <div className="control-section">
        <div className="small">Playback</div>
        <div className="playback-controls">
          <span className="pill step-indicator">
            <span className="mono">Step</span>
            <span className="mono">{stepLabel}</span>
          </span>
          <div className="button-group">
            <button className="primary-button" onClick={props.onRun}>
              Run
            </button>
            <button onClick={props.onPlayPause} disabled={!props.hasTrace}>
              {props.isPlaying ? "⏸️" : "▶️"}
            </button>
            <button onClick={() => props.onStep(-1)} disabled={!props.hasTrace} title="Previous Step">
              ⏮️
            </button>
            <button onClick={() => props.onStep(1)} disabled={!props.hasTrace} title="Next Step">
              ⏭️
            </button>
            <button onClick={props.onReset} disabled={!props.hasTrace}>
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Environment & Algorithm */}
      <div className="control-section">
        <div className="small">Environment</div>
        <select
          className="control-select"
          value={props.environmentId}
          onChange={(e) => props.onEnvironmentChange(e.target.value as EnvironmentId)}
        >
          <option value="grid">Abstract Grid</option>
          <option value="city">City Map</option>
          <option value="campus">Campus Map</option>
          <option value="dungeon">Dungeon / Maze</option>
          <option value="custom">Custom Map</option>
        </select>
      </div>

      <div className="control-section">
        <div className="small">Algorithm</div>
        <select 
          className="control-select"
          value={props.algorithm} 
          onChange={(e) => props.onAlgorithmChange(e.target.value as AlgorithmId)}
        >
          <option value="bfs">BFS (Breadth-First)</option>
          <option value="dfs">DFS (Depth-First)</option>
          <option value="dijkstra">Dijkstra (Shortest Path)</option>
          <option value="astar">A* (Heuristic Search)</option>
        </select>
      </div>

      {/* Comparison Mode */}
      <div className="control-section">
        <div className="small">Algorithm Comparison</div>
        <div className="comparison-controls">
          <button 
            className={`toggle-button ${props.compareOn ? 'active' : ''}`}
            onClick={() => props.onCompareOnChange(!props.compareOn)}
          >
            Compare: {props.compareOn ? "ON" : "OFF"}
          </button>
          <select
            className="control-select"
            value={props.compareAlgorithm}
            disabled={!props.compareOn}
            onChange={(e) => props.onCompareAlgorithmChange(e.target.value as AlgorithmId)}
          >
            <option value="bfs">BFS</option>
            <option value="dfs">DFS</option>
            <option value="dijkstra">Dijkstra</option>
            <option value="astar">A*</option>
          </select>
        </div>
      </div>

      {/* A* Heuristic */}
      {isAStar && (
        <div className="control-section">
          <div className="small">A* Heuristic Settings</div>
          <select
            className="control-select"
            value={props.heuristic}
            onChange={(e) => props.onHeuristicChange(e.target.value as HeuristicId)}
          >
            <option value="manhattan">Manhattan Distance</option>
            <option value="euclidean">Euclidean Distance</option>
          </select>
          <div className="heuristic-weight">
            <div className="small">
              Weight: <span className="mono weight-value">{props.heuristicWeight.toFixed(2)}</span>
            </div>
            <input
              className="weight-slider"
              type="range"
              min={0}
              max={5}
              step={0.05}
              value={props.heuristicWeight}
              onChange={(e) => props.onHeuristicWeightChange(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="control-section">
        <div className="small">Learning Settings</div>
        <select 
          className="control-select"
          value={props.learningLevel} 
          onChange={(e) => props.onLearningLevelChange(e.target.value as LearningLevel)}
        >
          <option value="beginner">👶 Beginner (Detailed)</option>
          <option value="intermediate">🎓 Intermediate</option>
          <option value="advanced">🔬 Advanced (Silent)</option>
        </select>
        <div className="settings-row">
          <button 
            className={`toggle-button ${props.explainMode ? 'active' : ''}`}
            onClick={() => props.onExplainModeChange(!props.explainMode)}
          >
            💬 Explain: {props.explainMode ? "ON" : "OFF"}
          </button>
          <span className="pill speed-indicator">
            <span className="mono">⚡ Speed</span>
            <span className="mono">{props.speedMs}ms</span>
          </span>
        </div>
        <input
          className="speed-slider"
          type="range"
          min={30}
          max={600}
          step={10}
          value={props.speedMs}
          onChange={(e) => props.onSpeedChange(Number(e.target.value))}
        />
      </div>

      {/* Draw Mode */}
      <div className="control-section">
        <div className="small">Drawing Tools</div>
        <div className="draw-controls">
          <div className="draw-mode-buttons">
            <button 
              className={`draw-button ${!props.isGrid ? 'disabled' : ''}`}
              onClick={() => props.onSetDrawMode("walls")} 
              disabled={!props.isGrid}
              title="Draw walls"
            >
              🧱 Walls
            </button>
            <button 
              className={`draw-button ${!props.isGrid ? 'disabled' : ''}`}
              onClick={() => props.onSetDrawMode("erase")} 
              disabled={!props.isGrid}
              title="Erase walls"
            >
              🧽 Erase
            </button>
            <button 
              className="draw-button"
              onClick={() => props.onSetDrawMode("start")}
              title="Set start point"
            >
              🟢 Start
            </button>
            <button 
              className="draw-button"
              onClick={() => props.onSetDrawMode("goal")}
              title="Set goal point"
            >
              🎯 Goal
            </button>
          </div>
          <div className="utility-buttons">
            <button 
              className={`utility-button ${!props.isGrid ? 'disabled' : ''}`}
              onClick={props.onClearWalls} 
              disabled={!props.isGrid}
              title="Clear all walls"
            >
              🗑️ Clear
            </button>
            <button 
              className={`utility-button ${!props.isGrid ? 'disabled' : ''}`}
              onClick={props.onRandomWalls} 
              disabled={!props.isGrid}
              title="Generate random walls"
            >
              🎲 Random
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

