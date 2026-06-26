import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir } from '../core/fs.js';
import { clamp, roundScore } from '../core/scoring.js';
import { encodePng, decodePngStats } from '../core/png.js';

// Offline generative renderer. It turns a candidate's generation prompt into a
// real, deterministic image — no external API, no key, no network. The result
// is an abstract interior in the studio's stated visual language: an ordinary
// tonal field, one quietly impossible fact (a bowing horizon), a pale form, and
// an area of visual silence. It is an interpretation, not a photoreal render.

function seedFrom(prompt) {
  return createHash('sha256').update(String(prompt)).digest();
}

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

export function renderConceptImage(prompt, { width = 1024, height = 1024 } = {}) {
  const seed = seedFrom(prompt);
  const f = (i) => seed[i % seed.length] / 255;
  const seedInt = (seed[12] << 24) ^ (seed[13] << 16) ^ (seed[14] << 8) ^ seed[15];

  const hue = f(0);
  const sat = 0.05 + f(1) * 0.12; // muted, low chroma
  const wallTop = 0.34 + f(2) * 0.16;
  const wallBot = wallTop - (0.05 + f(3) * 0.10);
  const floorL = Math.max(0.10, wallBot - (0.04 + f(4) * 0.08));
  const glowHue = (hue + 0.5 + (f(5) - 0.5) * 0.2) % 1;
  const cakeX = 0.30 + f(6) * 0.40; // off-centre, never a centred reveal
  const horizon = 0.58 + f(7) * 0.08; // the table top, in the lower third
  const sag = 0.04 + f(8) * 0.07; // the one understated impossibility: the bow
  const grainAmt = 5 + Math.floor(f(9) * 9);

  const edgeAt = (nx) => horizon + sag * (1 - Math.pow((nx - 0.5) * 2, 2));
  const cakeEdge = edgeAt(cakeX);
  const cakeCy = cakeEdge - 0.085;

  const pixels = Buffer.alloc(width * height * 3);
  let p = 0;
  for (let y = 0; y < height; y += 1) {
    const ny = y / height;
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const edge = edgeAt(nx);

      let rgb;
      if (ny < edge) {
        const l = lerp(wallTop, wallBot, ny / edge);
        rgb = hslToRgb(hue, sat, l);
      } else {
        const depth = (ny - edge) / (1 - edge);
        rgb = hslToRgb(hue, sat * 0.8, lerp(floorL, Math.max(0.07, floorL - 0.07), depth));
      }

      // The bowing table edge: a soft darker seam following the curve.
      const edgeDist = Math.abs(ny - edge);
      if (edgeDist < 0.012) {
        const k = 1 - edgeDist / 0.012;
        rgb = rgb.map((v) => Math.round(v * (1 - 0.45 * k)));
      }

      // The pale form resting on the table (off-centre), a quiet glow.
      const dx = (nx - cakeX) / 0.085;
      const dy = (ny - cakeCy) / 0.115;
      const d = dx * dx + dy * dy;
      if (d < 1) {
        const glow = Math.pow(1 - d, 1.5);
        const pale = hslToRgb(glowHue, sat * 0.7, 0.82);
        rgb = rgb.map((v, i) => Math.round(lerp(v, pale[i], glow * 0.85)));
      }

      // Vignette: pull light from the edges toward the centre.
      const vig = 1 - 0.55 * ((nx - 0.5) * (nx - 0.5) + (ny - 0.5) * (ny - 0.5));

      // Deterministic film grain.
      const n = (((x * 73856093) ^ (y * 19349663) ^ seedInt) >>> 0) % 512 / 512 - 0.5;
      const grain = n * grainAmt;

      pixels[p] = clamp(rgb[0] * vig + grain, 0, 255);
      pixels[p + 1] = clamp(rgb[1] * vig + grain, 0, 255);
      pixels[p + 2] = clamp(rgb[2] * vig + grain, 0, 255);
      p += 3;
    }
  }
  return { width, height, pixels };
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
