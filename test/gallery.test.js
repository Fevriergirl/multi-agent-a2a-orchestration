import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadProjectConfig } from '../src/config.js';
import { Studio } from '../src/core/studio.js';
import { DeterministicProvider } from '../src/providers/deterministic-provider.js';
import { runCreativeCycle } from '../src/engine/creative-cycle.js';
import { buildGallery } from '../src/engine/gallery.js';

test('gallery embeds rendered artifacts and audit scores as self-contained HTML', async () => {
  const config = await loadProjectConfig(process.cwd(), {});
  const home = await mkdtemp(path.join(os.tmpdir(), 'haunted-gallery-'));
  const studio = new Studio({ rootDir: home, constitution: config.constitution, experiment: config.experiment });

  const provider = new DeterministicProvider();
  const result = await runCreativeCycle({ studio, provider, observations: config.observations, generateImage: true });

  const outputPath = path.join(home, 'gallery.html');
  const built = await buildGallery({ studio, outputPath });
  assert.equal(built.cycleCount, 1);

  const html = await readFile(outputPath, 'utf8');
  assert.match(html, /Haunted Studio — gallery/);
  if (result.selected) {
    // An accepted cycle renders an embedded image and an audit score.
    assert.match(html, /data:image\/png;base64,/);
    assert.match(html, /audit /);
    assert.ok(html.includes(result.selected.title));
  }
  assert.ok(html.includes(result.cycleId));
});
