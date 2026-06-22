// ============================================================================
// Blinky.ai — sprites.ts
// Procedural 12x12 pixel-art "monster" sprites, rendered onto offscreen
// canvases with crisp, unsmoothed edges and a uniform black pixel outline.
// ============================================================================

const SPRITE_SIZE = 12;

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${s}% ${l}%)`;
}

/**
 * species 0: round blob · 1: spiky · 2: bat-wing · 3: chunky square
 * Body silhouette is computed analytically per-species, eyes are stamped on,
 * and any body pixel touching empty space is recolored to the outline color
 * to mimic the thick comic/pixel outline look of the reference art.
 */
export function buildSprite(species: number, hue: number, gold: boolean): HTMLCanvasElement {
  const g = SPRITE_SIZE;
  const cx = g / 2 - 0.5;
  const cy = g / 2 - 0.5;
  const body: number[][] = Array.from({ length: g }, () => new Array(g).fill(0));

  for (let y = 0; y < g; y++) {
    for (let x = 0; x < g; x++) {
      const dx = x - cx;
      const dy = y - cy;
      let on = false;
      if (species === 0) {
        on = (dx * dx) / 28 + (dy * dy) / 24 <= 1;
      } else if (species === 1) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        const spike = 1 + 0.18 * Math.abs(Math.sin(ang * 5));
        on = dist <= 4.6 * spike;
      } else if (species === 2) {
        on =
          Math.abs(dx) <= 5 &&
          Math.abs(dy) <= 4.4 &&
          !(Math.abs(dx) > 3.6 && dy < -0.5 && (x + y) % 2 === 0);
      } else {
        on = Math.abs(dx) <= 4.6 && Math.abs(dy) <= 4.6 && Math.abs(dx) + Math.abs(dy) <= 7.6;
      }
      if (on) body[y][x] = 1;
    }
  }

  const ey = Math.round(cy - 1);
  const ex1 = Math.round(cx - 2.2);
  const ex2 = Math.round(cx + 1.6);
  for (const ex of [ex1, ex2]) {
    if (body[ey]?.[ex] !== undefined) body[ey][ex] = 3;
  }

  const out = body.map((row) => row.slice());
  const neighbors: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let y = 0; y < g; y++) {
    for (let x = 0; x < g; x++) {
      if (body[y][x] !== 1) continue;
      for (const [ddx, ddy] of neighbors) {
        const nx = x + ddx;
        const ny = y + ddy;
        const empty = nx < 0 || ny < 0 || nx >= g || ny >= g || body[ny][nx] === 0;
        if (empty) {
          out[y][x] = 4;
          break;
        }
      }
    }
  }

  const colorBody = gold ? hsl(46, 95, 58) : hsl(hue, 68, 68);
  const colorShade = gold ? hsl(46, 95, 42) : hsl(hue, 60, 48);
  const colorEye = "#1a1a2e";
  const colorOutline = "#1a1a2e";

  const off = document.createElement("canvas");
  off.width = g;
  off.height = g;
  const octx = off.getContext("2d") as CanvasRenderingContext2D;
  octx.imageSmoothingEnabled = false;
  for (let y = 0; y < g; y++) {
    for (let x = 0; x < g; x++) {
      const v = out[y][x];
      if (v === 4) octx.fillStyle = colorOutline;
      else if (v === 3) octx.fillStyle = colorEye;
      else if (v === 1) octx.fillStyle = (x + y) % 5 === 0 ? colorShade : colorBody;
      else continue;
      octx.fillRect(x, y, 1, 1);
    }
  }
  return off;
}

export function buildHazardSprite(): HTMLCanvasElement {
  const g = SPRITE_SIZE;
  const off = document.createElement("canvas");
  off.width = g;
  off.height = g;
  const octx = off.getContext("2d") as CanvasRenderingContext2D;
  octx.imageSmoothingEnabled = false;
  for (let y = 0; y < g; y++) {
    for (let x = 0; x < g; x++) {
      const dx = x - 5.5;
      const dy = y - 5.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 5) {
        octx.fillStyle = dist > 4.1 ? "#1a1a2e" : (x + y) % 4 === 0 ? "#ff8fae" : "#ff5d8f";
        octx.fillRect(x, y, 1, 1);
      }
    }
  }
  octx.fillStyle = "#1a1a2e";
  octx.fillRect(4, 4, 1, 1);
  octx.fillRect(7, 4, 1, 1);
  return off;
}

const cache = new Map<string, HTMLCanvasElement>();
export function getSprite(species: number, hue: number, gold: boolean): HTMLCanvasElement {
  const key = `${species}_${gold ? "gold" : Math.round(hue / 12) * 12}`;
  let sprite = cache.get(key);
  if (!sprite) {
    sprite = buildSprite(species, hue, gold);
    cache.set(key, sprite);
  }
  return sprite;
}
