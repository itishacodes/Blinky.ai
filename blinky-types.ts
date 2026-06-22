// ============================================================================
// Blinky.ai — Agentic Evolution Laboratory
// Shared TypeScript contracts
// ============================================================================

/** A single discrete directional step taken by an agent on the grid. */
export interface Vec2 {
  dx: number;
  dy: number;
}

/** Grid coordinate (column / row), distinct from Vec2 to avoid unit confusion. */
export interface Cell {
  c: number;
  r: number;
}

/** A patrolling hazard that moves along a fixed corridor and destroys agents on contact. */
export interface Hazard {
  r: number;
  cMin: number;
  cMax: number;
  c: number;
  dir: 1 | -1;
  tickAcc: number;
}

/** Local perception bundle an agent's policy can read from before acting. */
export interface Sensors {
  wallAhead: boolean;
  hazardDist: number;
  checkpointDir: Vec2;
}

/** The static + dynamic world an agent population is evaluated in. */
export interface Environment {
  cols: number;
  rows: number;
  maze: string[];
  spawn: Cell;
  checkpoints: Cell[];
  hazards: Hazard[];
}

/** A single evolved organism. genes is the mutable action-space chromosome. */
export interface Agent {
  id: number;
  genes: Vec2[];
  geneIndex: number;
  x: number;
  y: number;
  alive: boolean;
  diedByHazard: boolean;
  ticksSurvived: number;
  checkpointsHit: boolean[];
  fitness: number;
  hue: number;
  species: number;
  isElite: boolean;
  trail: Cell[];
}

/** The full evolving cohort plus bookkeeping needed across generations. */
export interface Population {
  agents: Agent[];
  generation: number;
  chromosomeLength: number;
  bestEver: Agent | null;
}

/** One row of the evolution-slope telemetry, charted on the analytics board. */
export interface GenerationRecord {
  gen: number;
  best: number;
  survival: number;
}

/** User-tunable knobs exposed via the control cabinet sliders. */
export interface GAConfig {
  populationDensity: number; // population size
  chaosDrift: number;        // mutation rate, 0..1
  engineSpeed: number;       // simulation ticks per second multiplier
}

export type SandboxMode = "AI" | "MANUAL" | "HOF";
