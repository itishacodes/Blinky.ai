// ============================================================================
// Blinky.ai — environment.ts
// Static maze definition, checkpoint placement, and hazard patrol logic.
// ============================================================================

import type { Cell, Environment, Hazard, Vec2 } from "./blinky-types";

export const MAZE: string[] = [
  "################",
  "#..............#",
  "#.####.####.##.#",
  "#.#..........#.#",
  "#.#.########.#.#",
  "#.#.#......#.#.#",
  "#...#.####.#...#",
  "#.###.#..#.###.#",
  "#.....#..#.....#",
  "#.###########..#",
  "################",
];

export const COLS = MAZE[0].length;
export const ROWS = MAZE.length;
export const CELL_PX = 30;

export const SPAWN: Cell = { c: 1, r: 1 };

export const CHECKPOINTS: Cell[] = [
  { c: 14, r: 1 },
  { c: 8, r: 5 },
  { c: 2, r: 8 },
  { c: 13, r: 8 },
];

export const DIRS: Vec2[] = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

export function randDir(): Vec2 {
  return DIRS[(Math.random() * DIRS.length) | 0];
}

export function isWall(c: number, r: number): boolean {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
  return MAZE[r][c] === "#";
}

export function makeHazards(): Hazard[] {
  return [
    { r: 1, cMin: 5, cMax: 10, c: 5, dir: 1, tickAcc: 0 },
    { r: 3, cMin: 4, cMax: 11, c: 11, dir: -1, tickAcc: 0 },
    { r: 8, cMin: 10, cMax: 13, c: 10, dir: 1, tickAcc: 0 },
  ];
}

/** Advances every hazard one corridor-step every third tick, bouncing at bounds. */
export function stepHazards(hazards: Hazard[]): void {
  for (const h of hazards) {
    h.tickAcc++;
    if (h.tickAcc % 3 !== 0) continue;
    h.c += h.dir;
    if (h.c >= h.cMax || h.c <= h.cMin) h.dir = (h.dir * -1) as 1 | -1;
  }
}

export function buildEnvironment(): Environment {
  return {
    cols: COLS,
    rows: ROWS,
    maze: MAZE,
    spawn: SPAWN,
    checkpoints: CHECKPOINTS,
    hazards: makeHazards(),
  };
}
