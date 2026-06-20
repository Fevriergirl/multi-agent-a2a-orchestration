/**
 * Intention-fidelity tests.
 *
 * Three cases:
 *   (a) Hash recomputation — the frozen hash matches canonical re-derivation
 *   (b) Honoring case — a cycle that keeps all four claims reports all 'kept'
 *   (c) Violation case — a deliberately broken cycle emits intention_violated events
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canonicalize } from '../src/core/canonical-json.js';
import { checkFidelity } from '../src/core/fidelity.js';
import { Studio } from '../src/core/studio.js';
import { DeterministicProvider } from '../src/providers/deterministic-provider.js';
import { runCreativeCycle } from '../src/engine/creative-cycle.js';
import { readJson } from '../src/core/fs.js';

const cwd = process.cwd();
const constitution = await readJson(path.join(cwd, 'config', 'constitution.json'));
const experiment = await readJson(path.join(cwd, 'config', 'experiment.json'));
const observations = await readJson(path.join(cwd, 'observations', 'seed-observations.json'));

// ── (a) Hash recomputation ─────────────────────────────────────────────────

test('frozen intention hash matches canonical re-derivation from the same record', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-fidelity-hash-'));
  const studio = new Studio({ rootDir, constitution, experiment });
  const result = await runCreativeCycle({ studio, provider: new DeterministicProvider(), observations });

  // Read the frozen record from disk exactly as the cycle wrote it.
  const frozen = await readJson(path.join(studio.cycleDirectory(result.cycleId), '02-locked-intention.json'));
  const storedHash = frozen.intention_hash;

  // Recompute: strip the hash field, canonicalize, and SHA-256.
  const { intention_hash: _ignored, ...intentionRecord } = frozen;
  const recomputed = createHash('sha256').update(canonicalize(intentionRecord)).digest('hex');

  assert.equal(recomputed, storedHash,
    'recomputed hash must match the frozen hash — any field change would break this');
  assert.equal(result.intentionHash, storedHash,
    'return value must carry the same hash as the on-disk record');
  assert.equal(storedHash.length, 64, 'SHA-256 hex digest must be 64 characters');

  // The fidelity record references the same hash.
  const fidelity = await readJson(path.join(studio.cycleDirectory(result.cycleId), 'fidelity.json'));
  assert.equal(fidelity.intention_hash, storedHash,
    'fidelity record must reference the same frozen hash as the intention');
});

// ── (b) Honoring case ──────────────────────────────────────────────────────

test('a cycle that honors its intention reports all claims kept', async () => {
  // Build a candidate whose fields satisfy all four commitment dimensions:
  //   1. artifact_brief contains both target_motifs ('domestic-space', 'identity')
  //   2. No shortcut violations (shortcut_findings is empty)
  //   3. composition.entry_point contains none of the forbidden_terms
  //   4. composition.entry_point has high word-overlap with audience_encounter_prediction
  const lockedIntention = {
    target_motifs: ['domestic-space', 'identity'],
    forbidden_shortcut_ids: ['F1', 'F2', 'F3'],
    binding_constraint: {
      claim: 'The impossible element must not appear at the compositional entry point',
      test_field: 'composition.entry_point',
      forbidden_terms: ['center', 'centered', 'immediately visible', 'obvious', 'announces']
    },
    audience_encounter_prediction: 'an ordinary domestic space near the lower third'
  };

  const honoringCandidate = {
    id: 'cand_honor',
    title: 'Honoring study: domestic-space',
    strategy: 'Peripheral evidence',
    artifact_brief: 'The work pursues the cost of maintaining domestic-space when identity has already altered the room.',
    composition: {
      entry_point: 'an ordinary object near the lower third',   // matches prediction; no forbidden terms
      delayed_discovery: 'an impossible shadow at the edge',
      visual_silence: 'upper quarter holds no symbolic explanation'
    },
    proposed_accident: 'the shadow contradicts the light source'
  };

  const honoringCritique = {
    candidate_id: 'cand_honor',
    shortcut_findings: [],  // no violations
    scores: { formal: 0.8, truth: 0.75, historical: 0.8, adversarial_survival: 0.75, productive_surprise: 0.8 },
    confidence: 0.9,
    strongest_objection: 'none',
    revision: 'none'
  };

  const record = checkFidelity(lockedIntention, honoringCandidate, honoringCritique);

  assert.equal(record.summary.broken, 0, 'no claims should be broken for the honoring candidate');
  assert.equal(record.summary.kept, 4, 'all four claims should be kept');

  const motifsClaim = record.claims.find((c) => c.dimension === 'target_motifs');
  assert.deepEqual(motifsClaim.missing, [], 'target_motifs should have no missing entries');

  const shortcutsClaim = record.claims.find((c) => c.dimension === 'forbidden_shortcuts');
  assert.deepEqual(shortcutsClaim.violations_found, [], 'no shortcut violations should be found');

  const constraintClaim = record.claims.find((c) => c.dimension === 'binding_constraint');
  assert.deepEqual(constraintClaim.forbidden_terms_found, [], 'binding_constraint should not be falsified');
  assert.equal(constraintClaim.result, 'kept');

  const audienceClaim = record.claims.find((c) => c.dimension === 'audience_encounter');
  assert.ok(audienceClaim.overlap_score >= 0.4, `audience overlap should meet threshold, got ${audienceClaim.overlap_score}`);
  assert.equal(audienceClaim.result, 'kept');
});

// ── (c) Violation case ─────────────────────────────────────────────────────

test('a deliberately broken cycle catches and logs intention_violated events in the ledger', async () => {
  // We need a provider that:
  //   — generates a valid intention (with the new checkable fields)
  //   — generates a candidate that violates two of the four commitments:
  //       (i)  includes F1 shortcut ('cinematic lighting' in artifact_brief → F1 finding)
  //       (ii) places the impossible element at center (forbidden term 'centered' in entry_point)
  //   — returns a score above canon_threshold so the cycle accepts and the fidelity check runs

  class ViolatingProvider extends DeterministicProvider {
    async generateCandidates({ observation, intention, cycleId }) {
      // One candidate that violates two commitments:
      //   (i)  F1 shortcut — 'cinematic lighting' in artifact_brief
      //   (ii) binding_constraint — 'centered' in composition.entry_point
      return [{
        id: `candidate_${cycleId}_1`,
        title: 'Violation study',
        strategy: 'Peripheral evidence',
        artifact_brief: `Cinematic lighting floods the room. The work pursues: ${intention.about}`,
        composition: {
          entry_point: 'a centered reveal of the impossible object',  // 'centered' is forbidden
          delayed_discovery: 'a shadow at the edge',
          visual_silence: 'upper quarter'
        },
        proposed_accident: 'the shadow contradicts itself',
        medium: 'photoreal staged interior image',
        generation_prompt: 'Generate.',
        seed_signature: 0.5
      }];
    }

    // Keep scores high enough to accept so we can test accepted-cycle violation logging.
    async critiqueCandidate({ candidate, intention, state, constitution }) {
      const critique = await super.critiqueCandidate({ candidate, intention, state, constitution });
      // Override scores to be above threshold; keep the shortcut_findings as-is
      // (F1 will fire because 'cinematic lighting' is in the artifact_brief).
      return {
        ...critique,
        scores: {
          formal: 0.9,
          truth: 0.85,
          historical: 0.9,
          adversarial_survival: 0.85,
          productive_surprise: 0.85
        },
        confidence: 0.9
      };
    }
  }

  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-fidelity-violation-'));
  const studio = new Studio({ rootDir, constitution, experiment });
  const result = await runCreativeCycle({ studio, provider: new ViolatingProvider(), observations });

  // Fidelity record must exist on the return value.
  assert.ok(result.fidelityRecord, 'fidelityRecord must be present on cycle result');
  assert.equal(result.fidelityRecord.intention_hash, result.intentionHash,
    'fidelity record must reference the frozen intention hash');

  // At least two claims should be broken.
  const broken = result.fidelityRecord.claims.filter((c) => c.result === 'broken');
  assert.ok(broken.length >= 2, `expected at least 2 broken claims, got ${broken.length}: ${JSON.stringify(broken.map(c => c.dimension))}`);

  // F1 should appear in forbidden_shortcuts violations.
  const shortcutsClaim = result.fidelityRecord.claims.find((c) => c.dimension === 'forbidden_shortcuts');
  assert.ok(
    shortcutsClaim.violations_found.includes('F1'),
    `F1 shortcut should be caught as a violation, found: ${JSON.stringify(shortcutsClaim.violations_found)}`
  );

  // binding_constraint should be broken ('centered' in entry_point).
  const constraintClaim = result.fidelityRecord.claims.find((c) => c.dimension === 'binding_constraint');
  assert.equal(constraintClaim.result, 'broken', 'binding_constraint should be broken by "centered" in entry_point');
  assert.ok(constraintClaim.forbidden_terms_found.includes('centered'),
    `"centered" should appear in forbidden_terms_found, got: ${JSON.stringify(constraintClaim.forbidden_terms_found)}`);

  // Ledger must contain intention_violated events, one per broken claim.
  const events = await studio.ledger.readAll();
  const violations = events.filter((e) => e.type === 'intention_violated');
  assert.ok(violations.length >= 2,
    `expected at least 2 intention_violated events in ledger, got ${violations.length}`);

  // Each violation event must reference the frozen intention hash.
  for (const v of violations) {
    assert.equal(v.payload.intention_hash, result.intentionHash,
      'each intention_violated event must be linked to the frozen hash');
    assert.ok(v.payload.dimension, 'violation event must name the broken dimension');
  }

  // The violated dimensions logged in the ledger must match the broken claims.
  const loggedDimensions = violations.map((v) => v.payload.dimension).sort();
  const brokenDimensions = broken.map((c) => c.dimension).sort();
  assert.deepEqual(loggedDimensions, brokenDimensions,
    'every broken claim must produce exactly one intention_violated ledger event');

  // Ledger must still be valid — violations are logged, not suppressed.
  const verification = await studio.ledger.verify();
  assert.equal(verification.valid, true, 'ledger must be valid after a cycle with violations');

  // The fidelity.json file on disk must match the return value.
  const onDisk = await readJson(path.join(studio.cycleDirectory(result.cycleId), 'fidelity.json'));
  assert.equal(onDisk.intention_hash, result.intentionHash);
  assert.equal(onDisk.summary.broken, result.fidelityRecord.summary.broken);
});
