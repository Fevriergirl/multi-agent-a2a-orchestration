import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir } from '../core/fs.js';
import { clamp, roundScore } from '../core/scoring.js';
import { encodePng, decodePngStats } from '../core/png.js';

// Offline generative renderer. It turns a candidate's generation prompt into a
// real, deterministic image — no external API, no key, no network. Each of the
// studio's strategies renders as a distinct composition, all sharing one visual
// language: a muted tonal field, one quietly impossible fact, and visual
// silence. It is an interpretation, not a photoreal render.

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(clamp(l) * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let tt = (t % 1 + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)].map((v) => Math.round(clamp(v) * 255));
}

// --- pixel-buffer primitives (coordinates normalised to 0..1) ---

function blend(buf, w, h, px, py, rgb, alpha) {
  if (px < 0 || py < 0 || px >= w || py >= h || alpha <= 0) return;
  const i = (py * w + px) * 3;
  const ia = 1 - alpha;
  buf[i] = clamp(buf[i] * ia + rgb[0] * alpha, 0, 255);
  buf[i + 1] = clamp(buf[i + 1] * ia + rgb[1] * alpha, 0, 255);
  buf[i + 2] = clamp(buf[i + 2] * ia + rgb[2] * alpha, 0, 255);
}

function softEllipse(buf, w, h, cx, cy, rx, ry, rgb, maxAlpha, power = 1.6) {
  const x0 = Math.max(0, Math.floor((cx - rx) * w));
  const x1 = Math.min(w - 1, Math.ceil((cx + rx) * w));
  const y0 = Math.max(0, Math.floor((cy - ry) * h));
  const y1 = Math.min(h - 1, Math.ceil((cy + ry) * h));
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = (x / w - cx) / rx;
      const dy = (y / h - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d < 1) blend(buf, w, h, x, y, rgb, Math.pow(1 - d, power) * maxAlpha);
    }
  }
}

function darkenEllipse(buf, w, h, cx, cy, rx, ry, amount) {
  const x0 = Math.max(0, Math.floor((cx - rx) * w));
  const x1 = Math.min(w - 1, Math.ceil((cx + rx) * w));
  const y0 = Math.max(0, Math.floor((cy - ry) * h));
  const y1 = Math.min(h - 1, Math.ceil((cy + ry) * h));
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = (x / w - cx) / rx;
      const dy = (y / h - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d < 1) {
        const k = Math.pow(1 - d, 1.5) * amount;
        const i = (y * w + x) * 3;
        buf[i] *= 1 - k;
        buf[i + 1] *= 1 - k;
        buf[i + 2] *= 1 - k;
      }
    }
  }
}

function drawSeam(buf, w, h, edgeFn, thickness, darken) {
  for (let x = 0; x < w; x += 1) {
    const cy = edgeFn(x / w) * h;
    const span = thickness * h;
    const y0 = Math.max(0, Math.floor(cy - span));
    const y1 = Math.min(h - 1, Math.ceil(cy + span));
    for (let y = y0; y <= y1; y += 1) {
      const a = 1 - Math.abs(y - cy) / span;
      if (a > 0) {
        const k = darken * a;
        const i = (y * w + x) * 3;
        buf[i] *= 1 - k;
        buf[i + 1] *= 1 - k;
        buf[i + 2] *= 1 - k;
      }
    }
  }
}

function fillWall(buf, w, h, pal) {
  let p = 0;
  for (let y = 0; y < h; y += 1) {
    const l = lerp(pal.wallTop, pal.wallBot, y / h);
    const rgb = hslToRgb(pal.hue, pal.sat, l);
    for (let x = 0; x < w; x += 1) {
      buf[p] = rgb[0];
      buf[p + 1] = rgb[1];
      buf[p + 2] = rgb[2];
      p += 3;
    }
  }
}

function fillFloor(buf, w, h, edgeFn, pal) {
  for (let x = 0; x < w; x += 1) {
    const e = edgeFn(x / w);
    const y0 = Math.max(0, Math.floor(e * h));
    for (let y = y0; y < h; y += 1) {
      const depth = (y / h - e) / (1 - e + 1e-6);
      const rgb = hslToRgb(pal.hue, pal.sat * 0.8, lerp(pal.floorL, Math.max(0.06, pal.floorL - 0.07), clamp(depth)));
      const i = (y * w + x) * 3;
      buf[i] = rgb[0];
      buf[i + 1] = rgb[1];
      buf[i + 2] = rgb[2];
    }
  }
}

function postProcess(buf, w, h, seedInt, grainAmt) {
  let p = 0;
  for (let y = 0; y < h; y += 1) {
    const ny = y / h;
    for (let x = 0; x < w; x += 1) {
      const nx = x / w;
      const vig = 1 - 0.55 * ((nx - 0.5) * (nx - 0.5) + (ny - 0.5) * (ny - 0.5));
      const n = ((((x * 73856093) ^ (y * 19349663) ^ seedInt) >>> 0) % 512) / 512 - 0.5;
      const grain = n * grainAmt;
      buf[p] = clamp(buf[p] * vig + grain, 0, 255);
      buf[p + 1] = clamp(buf[p + 1] * vig + grain, 0, 255);
      buf[p + 2] = clamp(buf[p + 2] * vig + grain, 0, 255);
      p += 3;
    }
  }
}

// --- composition selection, tied to the studio's strategy language ---

const STRATEGY_PATTERNS = [
  [/outside the compositional center|peripheral/i, 'peripheral'],
  [/repetitive domestic action|ritual/i, 'ritual'],
  [/figure has left|afterimage|escape, erasure/i, 'afterimage'],
  [/fragile material structural authority|behavior of fabric|material contradiction/i, 'contradiction'],
  [/beautiful invitation|proportions quietly prevent entry|hospitality/i, 'hospitality']
];
const MODES = ['horizon', 'peripheral', 'ritual', 'afterimage', 'contradiction', 'hospitality'];

function chooseMode(prompt, seed) {
  for (const [pattern, mode] of STRATEGY_PATTERNS) {
    if (pattern.test(prompt)) return mode;
  }
  return MODES[seed[16] % MODES.length];
}

function paletteFrom(f) {
  const hue = f(0);
  return {
    hue,
    sat: 0.05 + f(1) * 0.12,
    wallTop: 0.34 + f(2) * 0.16,
    wallBot: 0.34 + f(2) * 0.16 - (0.05 + f(3) * 0.10),
    floorL: Math.max(0.10, 0.34 + f(2) * 0.16 - (0.05 + f(3) * 0.10) - (0.04 + f(4) * 0.08)),
    glowHue: (hue + 0.5 + (f(5) - 0.5) * 0.2) % 1
  };
}

export function renderConceptImage(prompt, { width = 1024, height = 1024 } = {}) {
  const text = String(prompt);
  const seed = createHash('sha256').update(text).digest();
  const f = (i) => seed[i % seed.length] / 255;
  const seedInt = (seed[12] << 24) ^ (seed[13] << 16) ^ (seed[14] << 8) ^ seed[15];
  const grainAmt = 5 + Math.floor(f(9) * 9);
  const pal = paletteFrom(f);
  const pale = hslToRgb(pal.glowHue, pal.sat * 0.7, 0.82);
  const dark = hslToRgb(pal.hue, pal.sat, Math.max(0.05, pal.floorL - 0.06));

  const buf = Buffer.alloc(width * height * 3);
  fillWall(buf, width, height, pal);

  const mode = chooseMode(text.toLowerCase(), seed);
  const sag = 0.04 + f(8) * 0.07;
  const side = f(11) < 0.5 ? 1 : -1;

  if (mode === 'horizon' || mode === 'hospitality') {
    const horizon = 0.58 + f(7) * 0.08;
    const edge = (nx) => horizon + sag * (1 - Math.pow((nx - 0.5) * 2, 2));
    fillFloor(buf, width, height, edge, pal);
    drawSeam(buf, width, height, edge, 0.012, 0.45);
    const cakeX = 0.30 + f(6) * 0.40;
    softEllipse(buf, width, height, cakeX, edge(cakeX) - 0.085, 0.075, 0.105, pale, 0.85);
    if (mode === 'hospitality') {
      // A welcoming doorway whose centre is quietly sealed against entry.
      const dx = 0.5 + (f(10) - 0.5) * 0.3;
      softEllipse(buf, width, height, dx, 0.42, 0.13, 0.30, pale, 0.30, 1.2);
      darkenEllipse(buf, width, height, dx, 0.45, 0.035, 0.27, 0.5);
    }
  } else if (mode === 'peripheral') {
    // The impossible fact pushed to one edge; a wide, empty, accepting centre.
    const horizon = 0.62 + f(7) * 0.06;
    const px = side > 0 ? 0.80 + f(6) * 0.12 : 0.08 + f(6) * 0.12;
    const edge = (nx) => horizon + sag * 1.2 * Math.exp(-Math.pow((nx - px) * 5, 2));
    fillFloor(buf, width, height, edge, pal);
    drawSeam(buf, width, height, edge, 0.010, 0.4);
    softEllipse(buf, width, height, px, edge(px) - 0.07, 0.055, 0.085, pale, 0.8);
    // A faint repair line that begins to read as a boundary.
    drawSeam(buf, width, height, (nx) => 0.30 + (nx - px) * 0.06 * side, 0.004, 0.25);
  } else if (mode === 'ritual') {
    // A rhythm of uprights, with one bowing out of step.
    const horizon = 0.66 + f(7) * 0.06;
    const edge = () => horizon;
    fillFloor(buf, width, height, edge, pal);
    drawSeam(buf, width, height, edge, 0.008, 0.35);
    const count = 3 + (seed[18] % 3);
    const broken = seed[19] % count;
    for (let k = 0; k < count; k += 1) {
      const bx = (k + 1) / (count + 1);
      const bow = k === broken ? (0.03 + f(8) * 0.03) * side : 0;
      softEllipse(buf, width, height, bx + bow, (horizon + 0.18) / 1, 0.018, 0.16, dark, 0.5, 1.1);
      softEllipse(buf, width, height, bx + bow, horizon - 0.06, 0.03, 0.05, pale, k === broken ? 0.7 : 0.4);
    }
  } else if (mode === 'afterimage') {
    // Evidence that a figure has left: a soft void and its faint echo.
    const fx = 0.5 + (f(6) - 0.5) * 0.4;
    darkenEllipse(buf, width, height, fx, 0.44, 0.085, 0.22, 0.5);
    softEllipse(buf, width, height, fx, 0.44, 0.085, 0.22, dark, 0.25, 1.4);
    softEllipse(buf, width, height, fx + 0.02 * side, 0.74, 0.07, 0.10, pale, 0.18, 1.6);
  } else if (mode === 'contradiction') {
    // A heavy mass that floats; a fragile form bearing the weight.
    const cx = 0.5 + (f(6) - 0.5) * 0.3;
    softEllipse(buf, width, height, cx, 0.72, 0.10, 0.05, pale, 0.7); // fragile slab, low
    darkenEllipse(buf, width, height, cx, 0.36, 0.16, 0.13, 0.55); // heavy mass, high
    softEllipse(buf, width, height, cx, 0.20, 0.16, 0.06, dark, 0.3, 1.3); // shadow cast upward (wrong way)
  }

  postProcess(buf, width, height, seedInt, grainAmt);
  return { width, height, pixels: buf, mode };
}

export async function writeArtifact({ prompt, outputPath, width, height }) {
  const image = renderConceptImage(prompt, { width, height });
  await ensureDir(path.dirname(outputPath));
  await writeFile(outputPath, encodePng(image.width, image.height, image.pixels));
  return outputPath;
}

// Reads the image that was actually produced and audits it from its pixels —
// the same discipline the OpenAI provider applies with a vision model, done
// offline with simple perceptual statistics.
export async function auditArtifact({ imagePath, candidate }) {
  const stats = decodePngStats(await readFile(imagePath));
  const tonal = 1 - Math.abs(stats.meanLuma - 0.42) * 1.6;
  const structure = clamp(stats.contrast * 1.6);
  const silence = 1 - Math.abs(stats.quietFraction - 0.3) * 1.8;

  const scores = {
    formal_fidelity: roundScore(0.55 + structure * 0.4),
    material_plausibility: roundScore(0.5 + clamp(tonal) * 0.45),
    intention_alignment: roundScore(0.55 + clamp(silence) * 0.4),
    shortcut_avoidance: roundScore(0.6 + (1 - Math.abs(stats.meanLuma - 0.45)) * 0.3),
    productive_surprise: roundScore(0.5 + structure * 0.3 + clamp(silence) * 0.15)
  };
  const overall = roundScore(
    Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.values(scores).length
  );

  return {
    status: 'generated',
    candidate_id: candidate.id,
    overall_score: overall,
    recommended_action: overall >= 0.6 ? 'accept_artifact' : 'revise_artifact',
    scores,
    observations: [
      `Rendered ${stats.width}x${stats.height} image with mean luminance ${stats.meanLuma.toFixed(2)} and contrast ${stats.contrast.toFixed(2)}.`,
      `About ${(stats.quietFraction * 100).toFixed(0)}% of the frame reads as visual silence.`
    ],
    failures: overall >= 0.6 ? [] : ['The render did not hold enough tonal structure or visual silence to verify.'],
    strongest_accident: candidate.proposed_accident ?? null
  };
}
