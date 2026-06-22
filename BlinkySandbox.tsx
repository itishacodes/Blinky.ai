// ============================================================================
// Blinky.ai — BlinkySandbox.tsx
// Unified, portfolio-ready dashboard container. Drop into any React + Tailwind
// workspace. Pulls in the typed engine modules (environment / agent /
// evolution / sprites) and renders the GameBoy-style three-panel layout:
// Control Cabinet · Simulation Viewport · Analytics Board.
//
// Dependencies: react, recharts
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import type { Agent, GAConfig, GenerationRecord, Hazard, Population, SandboxMode } from "./blinky-types";
import { CELL_PX, CHECKPOINTS, COLS, ROWS, MAZE, SPAWN, isWall, makeHazards, stepHazards } from "./blinky-environment";
import { cloneAgent, computeFitness, makeAgent, sense, stepAgent } from "./blinky-agent";
import { createInitialPopulation, evolveGeneration, reseedPopulation, INITIAL_CHROMOSOME_LENGTH } from "./blinky-evolution";
import { buildHazardSprite, getSprite } from "./blinky-sprites";

// ---------------------------------------------------------------------------
// Engine ref: everything that mutates every animation frame lives outside
// React state so the simulation can run at full speed without re-rendering
// the component tree on every tick. React state only mirrors the slow-moving
// telemetry (generation, high score, survival, chart history).
// ---------------------------------------------------------------------------
interface EngineRef {
  population: Population;
  hazards: Hazard[];
  mode: SandboxMode;
  showSwarm: boolean;
  paused: boolean;
  player: Agent | null;
  hofAgent: Agent | null;
  history: GenerationRecord[];
  hazardSprite: HTMLCanvasElement | null;
}

function allDone(pop: Population): boolean {
  return pop.agents.every((a) => !a.alive || a.geneIndex >= a.genes.length);
}

// ---------------------------------------------------------------------------
// Sub-component: header billboard
// ---------------------------------------------------------------------------
function HeaderBillboard({ modeLabel }: { modeLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-4 border-ink bg-gradient-to-b from-white to-cream px-5 py-3 shadow-[inset_0_-6px_0_#ffe1a8]">
      <div className="h-3.5 w-3.5 flex-none animate-pulse rounded-full bg-emerald-400 shadow-[0_0_0_3px_#1a1a2e]" />
      <h1 className="font-pixel text-[clamp(11px,1.5vw,18px)] tracking-wide text-ink">
        BLINKY<span className="text-pink-500">.ai</span> // AGENTIC EVOLUTION LABORATORY
      </h1>
      <div className="whitespace-nowrap rounded-lg bg-ink px-3 py-2 font-pixel text-[10px] text-amber-300">
        {modeLabel}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: control cabinet (left)
// ---------------------------------------------------------------------------
interface ControlCabinetProps {
  config: GAConfig;
  onConfigChange: (next: GAConfig) => void;
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  onManualMove: (dx: number, dy: number) => void;
  onToggleManual: () => void;
  onToggleHOF: () => void;
  statusText: string;
}

function ControlCabinet(props: ControlCabinetProps) {
  const { config, onConfigChange, paused, onTogglePause, onReset, onManualMove, onToggleManual, onToggleHOF, statusText } = props;
  return (
    <div className="rounded-2xl border-4 border-ink bg-cream p-4">
      <PanelTitle>CONTROL CABINET</PanelTitle>

      <div className="mb-3 flex justify-center gap-2">
        <DPadButton label="▲" onClick={() => onManualMove(0, -1)} />
      </div>
      <div className="mb-3 flex justify-center gap-2">
        <DPadButton label="◀" onClick={() => onManualMove(-1, 0)} />
        <div className="h-9 w-9 rounded-md bg-ink" />
        <DPadButton label="▶" onClick={() => onManualMove(1, 0)} />
      </div>
      <div className="mb-4 flex justify-center gap-2">
        <DPadButton label="▼" onClick={() => onManualMove(0, 1)} />
      </div>

      <div className="mb-4 flex justify-center gap-3">
        <RoundButton label="G" colorClass="bg-mint" onClick={onToggleHOF} title="Hall of Fame (G)" />
        <RoundButton label="P" colorClass="bg-amber-300" onClick={onToggleManual} title="Manual Override (P)" />
      </div>

      <LCDCard label="STATUS" value={statusText} small />

      <Slider
        label="POPULATION DENSITY"
        value={config.populationDensity}
        min={8}
        max={60}
        onChange={(v) => onConfigChange({ ...config, populationDensity: v })}
      />
      <Slider
        label="CHAOS DRIFT"
        value={Math.round(config.chaosDrift * 100)}
        suffix="%"
        min={0}
        max={60}
        onChange={(v) => onConfigChange({ ...config, chaosDrift: v / 100 })}
      />
      <Slider
        label="ENGINE SPEED"
        value={config.engineSpeed}
        min={1}
        max={12}
        onChange={(v) => onConfigChange({ ...config, engineSpeed: v })}
      />

      <div className="mt-2 flex gap-2">
        <CabinetButton onClick={onTogglePause}>{paused ? "▶ RESUME" : "⏸ PAUSE"}</CabinetButton>
        <CabinetButton onClick={onReset}>⟳ RESET</CabinetButton>
      </div>

      <div className="mt-3 space-y-1 text-sm leading-relaxed">
        <div><Kbd>SPACE</Kbd> swarm / elite-only</div>
        <div><Kbd>P</Kbd> manual override (WASD)</div>
        <div><Kbd>G</Kbd> hall of fame replay</div>
      </div>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 rounded-md bg-ink px-2 py-1.5 text-center font-pixel text-[10px] text-white">{children}</h2>;
}
function DPadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 w-9 rounded-md border-[3px] border-ink bg-slate-700 text-white shadow-[0_3px_0_#111] active:translate-y-[3px] active:shadow-none"
    >
      {label}
    </button>
  );
}
function RoundButton({ label, colorClass, onClick, title }: { label: string; colorClass: string; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-11 w-11 rounded-full border-[3px] border-ink font-pixel text-xs shadow-[0_4px_0_rgba(0,0,0,.3)] active:translate-y-1 active:shadow-none ${colorClass}`}
    >
      {label}
    </button>
  );
}
function LCDCard({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="mb-3 rounded-lg border-[3px] border-ink bg-lcd px-3 py-2 shadow-[inset_0_0_0_3px_#8fcf86]">
      <div className="text-xs uppercase tracking-wide opacity-75">{label}</div>
      <div className={small ? "text-sm font-bold" : "text-xl font-bold leading-none"}>{value}</div>
    </div>
  );
}
function Slider({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <b>{value}{suffix ?? ""}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2.5 w-full appearance-none rounded-md bg-ink accent-amber-300"
      />
    </div>
  );
}
function CabinetButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg border-[3px] border-ink bg-violet-300 px-2 py-2 font-pixel text-[9px] shadow-[0_3px_0_rgba(0,0,0,.3)] active:translate-y-[3px] active:shadow-none"
    >
      {children}
    </button>
  );
}
function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded bg-ink px-1.5 py-0.5 text-white">{children}</kbd>;
}

// ---------------------------------------------------------------------------
// Sub-component: analytics board (right)
// ---------------------------------------------------------------------------
function AnalyticsBoard({ generation, highScore, survival, genomeLength, history }: { generation: number; highScore: number; survival: number; genomeLength: number; history: GenerationRecord[] }) {
  return (
    <div className="rounded-2xl border-4 border-ink bg-cream p-4">
      <PanelTitle>ANALYTICS BOARD</PanelTitle>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <LCDCard label="GENERATION" value={generation} />
        <LCDCard label="HIGH SCORE" value={highScore} />
        <LCDCard label="SURVIVAL RATE" value={`${survival}%`} />
        <LCDCard label="GENOME LENGTH" value={genomeLength} />
      </div>
      <div className="h-[160px] rounded-lg border-[3px] border-ink bg-lcd p-2 shadow-[inset_0_0_0_3px_#8fcf86]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#8fcf86" />
            <XAxis dataKey="gen" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={30} />
            <Tooltip />
            <Line type="monotone" dataKey="best" stroke="#1a1a2e" strokeWidth={2} dot={{ r: 2, fill: "#3b8f3b" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-xs opacity-70">Evolution slope — best fitness per generation</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main container
// ---------------------------------------------------------------------------
export default function BlinkySandbox() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<EngineRef | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const [config, setConfig] = useState<GAConfig>({ populationDensity: 26, chaosDrift: 0.08, engineSpeed: 5 });
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState<SandboxMode>("AI");
  const [showSwarm, setShowSwarm] = useState(true);
  const [generation, setGeneration] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [survival, setSurvival] = useState(0);
  const [genomeLength, setGenomeLength] = useState(INITIAL_CHROMOSOME_LENGTH);
  const [history, setHistory] = useState<GenerationRecord[]>([]);

  // ---- init engine ----
  const resetEngine = useCallback(() => {
    const population = createInitialPopulation(config.populationDensity);
    engineRef.current = {
      population,
      hazards: makeHazards(),
      mode: "AI",
      showSwarm: true,
      paused: false,
      player: null,
      hofAgent: null,
      history: [],
      hazardSprite: buildHazardSprite(),
    };
    setGeneration(1);
    setHighScore(0);
    setSurvival(0);
    setGenomeLength(INITIAL_CHROMOSOME_LENGTH);
    setHistory([]);
    setMode("AI");
  }, [config.populationDensity]);

  useEffect(() => {
    resetEngine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) engineRef.current.paused = paused;
  }, [paused]);
  useEffect(() => {
    if (engineRef.current) engineRef.current.showSwarm = showSwarm;
  }, [showSwarm]);

  // ---- evolution tick ----
  const tickSimulation = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || eng.mode !== "AI") return;
    stepHazards(eng.hazards);
    for (const a of eng.population.agents) stepAgent(a, eng.hazards);
    const elite = eng.population.agents.find((a) => a.isElite) ?? eng.population.agents[0];
    if (elite?.alive) {
      elite.trail.push({ c: elite.x, r: elite.y });
      if (elite.trail.length > 18) elite.trail.shift();
    }
    if (allDone(eng.population)) {
      eng.population = evolveGeneration(eng.population, config.chaosDrift, eng.history);
      eng.hazards = makeHazards();
      setGeneration(eng.population.generation);
      setGenomeLength(eng.population.chromosomeLength);
      setHighScore(eng.population.bestEver?.fitness ?? 0);
      const last = eng.history[eng.history.length - 1];
      setSurvival(last ? last.survival : 0);
      setHistory([...eng.history]);
    }
  }, [config.chaosDrift]);

  // ---- manual override ----
  const toggleManual = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || eng.mode === "HOF") return;
    if (eng.mode === "MANUAL") {
      eng.mode = "AI";
      eng.player = null;
    } else {
      eng.mode = "MANUAL";
      const p = makeAgent([], 3);
      p.x = SPAWN.c;
      p.y = SPAWN.r;
      eng.player = p;
    }
    setMode(eng.mode);
  }, []);

  const manualMove = useCallback((dx: number, dy: number) => {
    const eng = engineRef.current;
    if (!eng || eng.mode !== "MANUAL" || !eng.player) return;
    const p = eng.player;
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (isWall(nx, ny)) return;
    p.x = nx;
    p.y = ny;
    p.ticksSurvived++;
    for (const h of eng.hazards) {
      if (h.c === p.x && h.r === p.y) p.alive = false;
    }
    CHECKPOINTS.forEach((cp, i) => {
      if (!p.checkpointsHit[i] && cp.c === p.x && cp.r === p.y) p.checkpointsHit[i] = true;
    });
    if (!p.alive) {
      setTimeout(() => {
        p.alive = true;
        p.x = SPAWN.c;
        p.y = SPAWN.r;
        p.checkpointsHit = CHECKPOINTS.map(() => false);
      }, 500);
    }
  }, []);

  // ---- hall of fame ----
  const toggleHOF = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || eng.mode === "MANUAL") return;
    if (eng.mode === "HOF") {
      eng.mode = "AI";
      eng.hofAgent = null;
    } else if (eng.population.bestEver) {
      eng.mode = "HOF";
      const a = cloneAgent(eng.population.bestEver);
      a.x = SPAWN.c;
      a.y = SPAWN.r;
      a.geneIndex = 0;
      a.trail = [];
      eng.hofAgent = a;
    }
    setMode(eng.mode);
  }, []);

  const tickHOF = useCallback(() => {
    const eng = engineRef.current;
    const a = eng?.hofAgent;
    if (!eng || !a) return;
    if (a.geneIndex >= a.genes.length) {
      a.x = SPAWN.c;
      a.y = SPAWN.r;
      a.geneIndex = 0;
      a.trail = [];
      return;
    }
    const gene = a.genes[a.geneIndex];
    a.geneIndex++;
    if (!isWall(a.x + gene.dx, a.y + gene.dy)) {
      a.x += gene.dx;
      a.y += gene.dy;
    }
    a.trail.push({ c: a.x, r: a.y });
    if (a.trail.length > 40) a.trail.shift();
  }, []);

  // ---- rendering ----
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const eng = engineRef.current;
    if (!canvas || !eng) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "#eaf6e8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === "#") {
          ctx.fillStyle = "#3b4a6b";
          ctx.fillRect(c * CELL_PX, r * CELL_PX, CELL_PX, CELL_PX);
          ctx.fillStyle = "#54699a";
          ctx.fillRect(c * CELL_PX + 3, r * CELL_PX + 3, CELL_PX - 8, CELL_PX - 8);
        }
      }
    }

    const pulse = 3 + Math.sin(Date.now() / 280) * 2;
    CHECKPOINTS.forEach((cp) => {
      const cx = cp.c * CELL_PX + CELL_PX / 2;
      const cy = cp.r * CELL_PX + CELL_PX / 2;
      ctx.save();
      ctx.shadowColor = "#5dd6ff";
      ctx.shadowBlur = pulse * 2;
      ctx.fillStyle = "#5dd6ff";
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + pulse * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + pulse * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    });

    const drawSprite = (a: Agent) => {
      const sp = getSprite(a.species, a.hue, a.isElite);
      const size = a.isElite ? CELL_PX - 2 : CELL_PX - 8;
      const ox = a.x * CELL_PX + (CELL_PX - size) / 2;
      const oy = a.y * CELL_PX + (CELL_PX - size) / 2;
      ctx.drawImage(sp, ox, oy, size, size);
    };
    const drawTrail = (trail: { c: number; r: number }[], color: string) => {
      trail.forEach((p, i) => {
        ctx.save();
        ctx.globalAlpha = ((i + 1) / trail.length) * 0.55;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.c * CELL_PX + CELL_PX / 2, p.r * CELL_PX + CELL_PX / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };
    const drawHazards = () => {
      if (!eng.hazardSprite) return;
      for (const h of eng.hazards) {
        ctx.drawImage(eng.hazardSprite, h.c * CELL_PX + 3, h.r * CELL_PX + 3, CELL_PX - 6, CELL_PX - 6);
      }
    };

    if (eng.mode === "AI") {
      drawHazards();
      const elite = eng.population.agents.find((a) => a.isElite);
      if (elite) drawTrail(elite.trail, "rgba(255,217,61,0.9)");
      if (eng.showSwarm) {
        for (const a of eng.population.agents) {
          if (!a.alive || a.isElite) continue;
          drawSprite(a);
        }
      }
      if (elite?.alive) drawSprite(elite);
    } else if (eng.mode === "MANUAL") {
      drawHazards();
      const p = eng.player;
      if (p) {
        if (!p.alive) {
          ctx.fillStyle = "#ff5d8f";
          ctx.font = "10px monospace";
          ctx.fillText("×", p.x * CELL_PX + CELL_PX / 2 - 4, p.y * CELL_PX + CELL_PX / 2 + 4);
        } else {
          ctx.save();
          ctx.shadowColor = "#00d4ff";
          ctx.shadowBlur = 6;
          drawSprite(p);
          ctx.restore();
        }
      }
    } else if (eng.mode === "HOF" && eng.hofAgent) {
      drawTrail(eng.hofAgent.trail, "rgba(255,217,61,0.85)");
      drawSprite(eng.hofAgent);
    }
  }, []);

  // ---- main loop ----
  useEffect(() => {
    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const eng = engineRef.current;
      if (!eng) return;
      if (!eng.paused) {
        const interval = 1000 / (config.engineSpeed * 4);
        if (ts - lastTickRef.current >= interval) {
          lastTickRef.current = ts;
          if (eng.mode === "AI") tickSimulation();
          if (eng.mode === "HOF") tickHOF();
        }
      }
      render();
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [config.engineSpeed, tickSimulation, tickHOF, render]);

  // ---- keyboard ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ([" ", "p", "g", "w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        e.preventDefault();
      }
      if (k === " ") {
        setShowSwarm((s) => !s);
      } else if (k === "p") {
        toggleManual();
      } else if (k === "g") {
        toggleHOF();
      } else if (engineRef.current?.mode === "MANUAL") {
        if (k === "w" || k === "arrowup") manualMove(0, -1);
        else if (k === "s" || k === "arrowdown") manualMove(0, 1);
        else if (k === "a" || k === "arrowleft") manualMove(-1, 0);
        else if (k === "d" || k === "arrowright") manualMove(1, 0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleManual, toggleHOF, manualMove]);

  // ---- population density change requires reseed ----
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.population.agents = reseedPopulation(config.populationDensity, eng.population.bestEver, eng.population.chromosomeLength);
  }, [config.populationDensity]);

  const modeLabel = mode === "AI" ? (showSwarm ? "AI SWARM" : "ELITE ONLY") : mode === "MANUAL" ? "MANUAL OVERRIDE" : "HALL OF FAME";
  const statusText = mode === "MANUAL" ? "YOU ARE PLAYING — WASD/ARROWS" : mode === "HOF" ? "REPLAYING PEAK RUN" : "EVOLVING…";

  return (
    <div className="flex justify-center bg-gradient-to-b from-sky to-cream p-4">
      <div className="w-full max-w-[1320px] rounded-[28px] border-[6px] border-ink bg-shell p-4 shadow-[0_10px_0_#e35353,0_14px_24px_rgba(0,0,0,.25)]">
        <div className="mb-4">
          <HeaderBillboard modeLabel={modeLabel} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)_280px]">
          <ControlCabinet
            config={config}
            onConfigChange={setConfig}
            paused={paused}
            onTogglePause={() => setPaused((p) => !p)}
            onReset={resetEngine}
            onManualMove={manualMove}
            onToggleManual={toggleManual}
            onToggleHOF={toggleHOF}
            statusText={statusText}
          />

          <div className="rounded-2xl border-4 border-ink bg-cream p-4">
            <PanelTitle>SIMULATION VIEWPORT</PanelTitle>
            <div className="flex flex-col items-center rounded-2xl border-[6px] border-ink bg-[#222b45] p-3 shadow-[inset_0_0_0_4px_#3a4566]">
              <canvas
                ref={canvasRef}
                width={COLS * CELL_PX}
                height={ROWS * CELL_PX}
                className="max-w-full rounded-md border-4 border-ink"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-white">
                <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 border-2 border-white bg-amber-300" />Elite agent</span>
                <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 border-2 border-white bg-green-400" />Population</span>
                <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 border-2 border-white bg-pink-400" />Hazard</span>
                <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 border-2 border-white bg-sky-300" />Checkpoint</span>
              </div>
            </div>
          </div>

          <AnalyticsBoard
            generation={generation}
            highScore={highScore}
            survival={survival}
            genomeLength={genomeLength}
            history={history}
          />
        </div>
      </div>
    </div>
  );
}

/*
Tailwind config additions used above:

  theme: {
    extend: {
      colors: {
        sky: "#a2d2ff",
        cream: "#fff7e6",
        shell: "#ff7a7a",
        ink: "#1a1a2e",
        lcd: "#bfe6b8",
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
      },
    },
  },

Load 'Press Start 2P' and 'VT323' from Google Fonts (or self-host) and set
the body's base font-family to VT323 for the LCD-screen body copy.
*/
