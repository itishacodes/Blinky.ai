// ============================================================================
// Blinky.ai — evolution.ts
// Selection, crossover, mutation, elitism, and incremental action-space growth.
// ============================================================================

import type { Agent, GenerationRecord, Population, Vec2 } from "./blinky-types";
import { makeHazards, randDir } from "./blinky-environment";
import { cloneAgent, computeFitness, makeAgent, newGenes } from "./blinky-agent";

export const MAX_CHROMOSOME_LENGTH = 200;
export const GROWTH_INTERVAL_GENERATIONS = 5;
export const GROWTH_STEP = 10;
export const INITIAL_CHROMOSOME_LENGTH = 30;

export function createInitialPopulation(size: number): Population {
  const agents: Agent[] = [];
  for (let i = 0; i < size; i++) {
    agents.push(makeAgent(newGenes(INITIAL_CHROMOSOME_LENGTH), i));
  }
  return { agents, generation: 1, chromosomeLength: INITIAL_CHROMOSOME_LENGTH, bestEver: null };
}

function tournamentSelect(pool: Agent[], k: number): Agent {
  let best: Agent | null = null;
  for (let i = 0; i < k; i++) {
    const cand = pool[(Math.random() * pool.length) | 0];
    if (!best || cand.fitness > best.fitness) best = cand;
  }
  return best as Agent;
}

function crossover(g1: Vec2[], g2: Vec2[], targetLen: number): Vec2[] {
  const cut = (Math.random() * Math.min(g1.length, g2.length)) | 0;
  const child = g1.slice(0, cut).concat(g2.slice(cut));
  while (child.length < targetLen) child.push(randDir());
  return child.slice(0, targetLen);
}

function mutate(genes: Vec2[], rate: number): void {
  for (let i = 0; i < genes.length; i++) {
    if (Math.random() < rate) genes[i] = randDir();
  }
}

/**
 * Closes out a finished generation: scores every agent, records telemetry,
 * isolates the elite blueprint, optionally grows the action-space (every
 * GROWTH_INTERVAL_GENERATIONS generations), and breeds the next cohort via
 * tournament selection + single-point crossover + chaos-drift mutation.
 */
export function evolveGeneration(
  pop: Population,
  mutationRate: number,
  history: GenerationRecord[]
): Population {
  pop.agents.forEach(computeFitness);
  const sorted = pop.agents.slice().sort((a, b) => b.fitness - a.fitness);
  const champion = sorted[0];

  let bestEver = pop.bestEver;
  if (!bestEver || champion.fitness > bestEver.fitness) {
    bestEver = cloneAgent(champion);
    bestEver.fitness = champion.fitness;
    bestEver.checkpointsHit = champion.checkpointsHit.slice();
  }

  const aliveCount = pop.agents.filter((a) => a.alive).length;
  history.push({
    gen: pop.generation,
    best: champion.fitness,
    survival: Math.round((100 * aliveCount) / pop.agents.length),
  });
  if (history.length > 40) history.shift();

  const nextGeneration = pop.generation + 1;
  let chromosomeLength = pop.chromosomeLength;
  if (nextGeneration % GROWTH_INTERVAL_GENERATIONS === 0) {
    chromosomeLength = Math.min(MAX_CHROMOSOME_LENGTH, chromosomeLength + GROWTH_STEP);
  }

  const elite = cloneAgent(champion);
  while (elite.genes.length < chromosomeLength) elite.genes.push(randDir());
  elite.genes = elite.genes.slice(0, chromosomeLength);
  elite.isElite = true;

  const nextAgents: Agent[] = [elite];
  for (let i = 1; i < pop.agents.length; i++) {
    const pa = tournamentSelect(sorted, 3);
    const pb = tournamentSelect(sorted, 3);
    const childGenes = crossover(pa.genes, pb.genes, chromosomeLength);
    mutate(childGenes, mutationRate);
    nextAgents.push(makeAgent(childGenes, i));
  }

  return {
    agents: nextAgents,
    generation: nextGeneration,
    chromosomeLength,
    bestEver,
  };
}

/** Reseeds a population from scratch, carrying the all-time elite forward if present. */
export function reseedPopulation(size: number, bestEver: Agent | null, chromosomeLength: number): Agent[] {
  const agents: Agent[] = [];
  for (let i = 0; i < size; i++) {
    agents.push(makeAgent(newGenes(chromosomeLength), i));
  }
  if (bestEver) {
    const elite = cloneAgent(bestEver);
    while (elite.genes.length < chromosomeLength) elite.genes.push(randDir());
    elite.genes = elite.genes.slice(0, chromosomeLength);
    elite.isElite = true;
    agents[0] = elite;
  }
  return agents;
}

export { makeHazards };
