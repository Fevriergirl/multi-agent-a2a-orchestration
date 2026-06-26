import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { encodePng, decodePngStats } from '../src/core/png.js';
import { renderConceptImage, writeArtifact, auditArtifact } from '../src/render/artifact.js';
import { DeterministicProvider } from '../src/providers/deterministic-provider.js';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test('PNG codec round-trips pixels into readable statistics', () => {
  const width = 4;
  const height = 4;
  const pixels = Buffer.alloc(width * height * 3, 128); // flat mid-grey
  const png = encodePng(width, height, pixels);
  assert.ok(png.subarray(0, 8).equals(PNG_SIGNATURE), 'has PNG signature');
  const stats = decodePngStats(png);
  assert.equal(stats.width, 4);
  assert.equal(stats.height, 4);
  assert.ok(Math.abs(stats.meanLuma - 128 / 255) < 0.01);
  assert.equal(stats.quietFraction, 1); // a flat field is entirely "quiet"
});

test('renderConceptImage is deterministic for a given prompt', () => {
  const a = renderConceptImage('a door painted like open sky', { width: 64, height: 64 });
  const b = renderConceptImage('a door painted like open sky', { width: 64, height: 64 });
  const c = renderConceptImage('a different observation entirely', { width: 64, height: 64 });
  assert.ok(a.pixels.equals(b.pixels), 'same prompt → identical pixels');
  assert.ok(!a.pixels.equals(c.pixels), 'different prompt → different pixels');
});

test('writeArtifact produces a real PNG and auditArtifact reads it back', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'haunted-render-'));
  const outputPath = path.join(dir, 'artifact.png');
  await writeArtifact({ prompt: 'a waiting-room clock with twelve minute hands', outputPath, width: 256, height: 256 });

  const bytes = await readFile(outputPath);
  assert.ok(bytes.subarray(0, 8).equals(PNG_SIGNATURE));

  const audit = await auditArtifact({ imagePath: outputPath, candidate: { id: 'cand-1', proposed_accident: 'the seam becomes a boundary' } });
  assert.equal(audit.candidate_id, 'cand-1');
  assert.equal(typeof audit.overall_score, 'number');
  assert.ok(audit.overall_score >= 0 && audit.overall_score <= 1);
  assert.ok(['accept_artifact', 'revise_artifact', 'reject_artifact'].includes(audit.recommended_action));
});

test('the deterministic provider can generate and audit an artifact offline', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'haunted-provider-render-'));
  const outputPath = path.join(dir, 'artifact.png');
  const provider = new DeterministicProvider();
  await provider.generateArtifact({ prompt: 'an empty chair turned to face the wall', outputPath });
  const audit = await provider.inspectArtifact({ imagePath: outputPath, candidate: { id: 'cand-x' } });
  assert.equal(audit.status, 'generated');
  assert.equal(typeof audit.overall_score, 'number');
});
