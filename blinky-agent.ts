// ============================================================================
// Blinky.ai — agent.ts
// Agent construction, sensing, single-step execution, and fitness scoring.
// ============================================================================

import type { Agent, Hazard, Sensors, Vec2 } from "./blinky-types";
import { CHECKPOINTS, isWall, randDir, SPAWN } from "./blinky-environment";

let nextId = 1;
export function resetIdCounter(): void {
  nextId = 1;
}

export function newGenes(length: number): Vec2[] {
  const genes: Vec2[] = [];
  for (let i = 0; i < length; i++) genes.push(randDir());
  return genes;
}

export function makeAgent(genes: Vec2[], species: number): Agent {
  return {
    id: nextId++,
    genes,
    geneIndex: 0,
    x: SPAWN.c,
    y: SPAWN.r,
    alive: true,
    diedByHazard: false,
    ticksSurvived: 0,
    checkpointsHit: CHECKPOINTS.map(() => false),
    fitness: 0,
    hue: (species * 61 + Math.random() * 30) % 360,
    species: species % 4,
    isElite: false,
    trail: [],
  };
}

export function cloneAgent(a: Agent): Agent {
  const c = makeAgent(a.genes.slice(), a.species);
  c.hue = a.hue;
  return c;
}

/**
 * Local perception: distance to the nearest wall along the agent's queued
 * move, Manhattan distance to the closest hazard, and a unit vector toward
 * the nearest uncollected checkpoint. This is read every tick and used both
 * to gate illegal moves and to shape fitness/telemetry.
 */
export function sense(agent: Agent, hazards: Hazard[]): Sensors {
  const gene = agent.genes[agent.geneIndex] ?? { dx: 0, dy: 0 };
  const nx = agent.x + gene.dx;
  const ny = agent.y + gene.dy;
  const wallAhead = isWall(nx, ny);

  let hazardDist = Infinity;
  for (const h of hazards) {
    const d = Math.abs(h.r - agent.y) + Math.abs(h.c - agent.x);
    if (d < hazardDist) hazardDist = d;
  }

  let target: { c: number; r: number } | null = null as { c: number; r: number } | null;
  let best = Infinity;
  agent.checkpointsHit.forEach((hit, i) => {
    if (hit) return;
    const cp = CHECKPOINTS[i];
    const d = Math.abs(cp.c - agent.x) + Math.abs(cp.r - agent.y);
    if (d < best) {
      best = d;
      target = cp;
    }
  });

  const checkpointDir: Vec2 = target
    ? { dx: Math.sign(target.c - agent.x), dy: Math.sign(target.r - agent.y) }
    : { dx: 0, dy: 0 };

  return { wallAhead, hazardDist, checkpointDir };
}

/** Executes one chromosome step for a single agent against the live environment. */
export function stepAgent(agent: Agent, hazards: Hazard[]): void {
  if (!agent.alive) return;
  if (agent.geneIndex >= agent.genes.length) return; // genome exhausted, idles in place

  const s = sense(agent, hazards);
  const gene = agent.genes[agent.geneIndex];
  agent.geneIndex++;

  if (!s.wallAhead) {
    agent.x += gene.dx;
    agent.y += gene.dy;
  }
  agent.ticksSurvived++;

  for (const h of hazards) {
    if (h.c === agent.x && h.r === agent.y) {
      agent.alive = false;
      agent.diedByHazard = true;
      break;
    }
  }

  CHECKPOINTS.forEach((cp, i) => {
    if (!agent.checkpointsHit[i] && cp.c === agent.x && cp.r === agent.y) {
      agent.checkpointsHit[i] = true;
    }
  });
}

/** Fitness rewards checkpoint progress and survival time, penalizes hazard death. */
export function computeFitness(agent: Agent): number {
  const hits = agent.checkpointsHit.filter(Boolean).length;
  let f = hits * 1000 + agent.ticksSurvived * 2;
  if (agent.diedByHazard) f -= 250;
  if (agent.alive) f += 150;
  agent.fitness = f;
  return f;
}
