import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir } from '../core/fs.js';

// Builds a single, self-contained HTML gallery for a studio run: every cycle's
// rendered artifact (embedded as a data URI), its concept, the curator's
// decision, and the visual audit. No dependencies, no server — open the file.

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function collectCycles(worksDir) {
  let entries;
  try {
    entries = await readdir(worksDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const cycles = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(worksDir, entry.name);
    const manifest = await readJson(path.join(dir, 'manifest.json'));
    if (!manifest) continue;
    let image = null;
    try {
      image = await readFile(path.join(dir, 'artifact.png'));
    } catch {
      image = null;
    }
    cycles.push({ manifest, image });
  }
  cycles.sort((a, b) => String(a.manifest.generated_at).localeCompare(String(b.manifest.generated_at)));
  return cycles;
}

function scoreBars(scores) {
  if (!scores) return '';
  return Object.entries(scores)
    .map(([key, value]) => {
      const pct = Math.round(Number(value) * 100);
      return `<div class="bar"><span class="bar-label">${escapeHtml(key.replaceAll('_', ' '))}</span>`
        + `<span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>`
        + `<span class="bar-val">${escapeHtml(value)}</span></div>`;
    })
    .join('');
}

function card({ manifest, image }) {
  const selected = manifest.selected_candidate;
  const decision = manifest.curation?.decision ?? 'unknown';
  const status = manifest.canon_status ?? (selected ? 'conceptual_only' : 'refused');
  const audit = manifest.artifact_audit;

  const figure = image
    ? `<img class="art" alt="rendered artifact" src="data:image/png;base64,${image.toString('base64')}">`
    : `<div class="art placeholder">${selected ? 'conceptual only — no image rendered' : 'refused — no work entered canon'}</div>`;

  return `<article class="card">
    ${figure}
    <div class="meta">
      <h2>${escapeHtml(selected ? selected.title : 'Refusal')}</h2>
      <div class="badges">
        <span class="badge decision-${escapeHtml(decision)}">${escapeHtml(decision)}</span>
        <span class="badge status">${escapeHtml(status)}</span>
        ${manifest.curation?.score != null ? `<span class="badge score">score ${escapeHtml(manifest.curation.score)}</span>` : ''}
        ${audit?.overall_score != null ? `<span class="badge audit">audit ${escapeHtml(audit.overall_score)}</span>` : ''}
      </div>
      <p class="observation">${escapeHtml(manifest.observation?.text)}</p>
      ${selected ? `<p class="brief">${escapeHtml(selected.strategy)} — ${escapeHtml(selected.medium ?? '')}</p>` : `<p class="brief">${escapeHtml(manifest.curation?.rationale)}</p>`}
      ${audit ? `<div class="bars">${scoreBars(audit.scores)}</div>` : ''}
      ${audit?.observations ? `<ul class="audit-notes">${audit.observations.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : ''}
      <p class="cid">${escapeHtml(manifest.cycle_id)}</p>
    </div>
  </article>`;
}

function renderHtml(cycles, { home }) {
  const verified = cycles.filter((c) => c.manifest.canon_status === 'verified_artifact').length;
  const accepted = cycles.filter((c) => c.manifest.selected_candidate).length;
  const refused = cycles.length - accepted;
  const cards = cycles.length
    ? cycles.map(card).join('\n')
    : '<p class="empty">No cycles found. Run <code>npm run art</code> first.</p>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Haunted Studio — gallery</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0d0f12; color: #d7dade; font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif; }
  header { padding: 28px 32px; border-bottom: 1px solid #1d2127; position: sticky; top: 0; background: #0d0f12ee; backdrop-filter: blur(6px); }
  header h1 { margin: 0 0 6px; font-size: 20px; font-weight: 650; letter-spacing: .2px; }
  header .sub { color: #8b929c; font-size: 13px; }
  header .stats { margin-top: 10px; display: flex; gap: 18px; flex-wrap: wrap; font-size: 13px; color: #aeb4bd; }
  header .stats b { color: #e8eaed; }
  main { padding: 28px 32px; display: grid; gap: 26px; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }
  .card { background: #14171c; border: 1px solid #20242b; border-radius: 12px; overflow: hidden; }
  .art { display: block; width: 100%; aspect-ratio: 1/1; object-fit: cover; background: #0a0c0f; }
  .art.placeholder { display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 13px; text-align: center; padding: 20px; }
  .meta { padding: 16px 18px 18px; }
  .meta h2 { margin: 0 0 10px; font-size: 16px; font-weight: 600; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .badge { font-size: 11px; padding: 3px 9px; border-radius: 999px; background: #232830; color: #c7ccd3; letter-spacing: .3px; }
  .badge.decision-accept { background: #14361f; color: #6ee7a0; }
  .badge.decision-reject_all { background: #3a1d1d; color: #f0a3a3; }
  .badge.decision-revise { background: #34301a; color: #e6cf7a; }
  .badge.status { background: #1b2a3a; color: #8fc4f0; }
  .observation { color: #c2c7cf; font-style: italic; margin: 0 0 8px; }
  .brief { color: #9aa1ab; font-size: 13px; margin: 0 0 12px; }
  .bars { display: grid; gap: 6px; margin: 12px 0; }
  .bar { display: grid; grid-template-columns: 130px 1fr 38px; gap: 8px; align-items: center; font-size: 11px; color: #99a0aa; }
  .bar-track { height: 6px; background: #20242b; border-radius: 999px; overflow: hidden; }
  .bar-fill { display: block; height: 100%; background: linear-gradient(90deg, #4a82c4, #7ad1c0); }
  .bar-val { text-align: right; color: #c7ccd3; }
  .audit-notes { margin: 10px 0 0; padding-left: 16px; color: #828a94; font-size: 12px; }
  .cid { margin: 12px 0 0; color: #4f5662; font-size: 11px; font-family: ui-monospace, monospace; word-break: break-all; }
  .empty { color: #828a94; }
  code { background: #20242b; padding: 2px 6px; border-radius: 5px; }
</style>
</head>
<body>
<header>
  <h1>Haunted Studio — gallery</h1>
  <div class="sub">${escapeHtml(home)} · generated ${escapeHtml(new Date().toISOString())}</div>
  <div class="stats">
    <span><b>${cycles.length}</b> cycles</span>
    <span><b>${accepted}</b> accepted</span>
    <span><b>${verified}</b> verified artifacts</span>
    <span><b>${refused}</b> refused</span>
  </div>
</header>
<main>
${cards}
</main>
</body>
</html>`;
}

export async function buildGallery({ studio, outputPath }) {
  const cycles = await collectCycles(studio.worksDir);
  const html = renderHtml(cycles, { home: studio.rootDir });
  await ensureDir(path.dirname(outputPath));
  await writeFile(outputPath, html, 'utf8');
  return { outputPath, cycleCount: cycles.length, html };
}
