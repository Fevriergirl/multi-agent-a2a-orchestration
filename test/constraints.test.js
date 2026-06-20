/**
 * Tests for the core "haunted" constraint logic:
 * shortcut detection, score thresholds, motif pressure,
 * memory ablation, and canon budget enforcement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DeterministicProvider } from '../src/providers/deterministic-provider.js';
import { Studio } from '../src/core/studio.js';
import { runCreativeCycle } from '../src/engine/creative-cycle.js';
import { weightedScore, roundScore } from '../src/core/scoring.js';
import { readJson } from '../src/core/fs.js';

const cwd = process.cwd();
const constitution = await readJson(path.join(cwd, 'config', 'constitution.json'));
const baseExperiment = await readJson(path.join(cwd, 'config', 'experiment.json'));
const observations = await readJson(path.join(cwd, 'observations', 'seed-observations.json'));

// ─── SHORTCUT DETECTION ──────────────────────────────────────────────────────

test('F1 shortcut fires when artifact_brief contains "cinematic lighting"', async () => {
  const provider = new DeterministicProvider();
  const candidate = {
    id: 'cand_test_F1',
    title: 'Test F1',
    strategy: 'Peripheral evidence',
    artifact_brief: 'A room lit with cinematic lighting to convey dread.',
    composition: { entry_point: 'lower left', delayed_discovery: 'a door', visual_silence: '1/4 frame' },
    proposed_accident: 'a shadow doubles',
    medium: 'photograph',
    generation_prompt: 'Generate a room.',
    seed_signature: 0.5
  };
  const critique = await provider.critiqueCandidate({ candidate, intention: { about: 'test', must_include: [], must_avoid: [] }, state: { motifs: {}, unresolved_tensions: [] }, constitution });
  const f1 = critique.shortcut_findings.find((f) => f.id === 'F1');
  assert.ok(f1, 'F1 shortcut should be detected when "cinematic lighting" is in artifact_brief');
  assert.equal(f1.penalty, 0.18);
});

test('F2 shortcut fires when artifact_brief contains "decay"', async () => {
  const provider = new DeterministicProvider();
  const candidate = {
    id: 'cand_test_F2',
    title: 'Test F2',
    strategy: 'Ritual under pressure',
    artifact_brief: 'Decorative decay covers every surface without structural purpose.',
    composition: { entry_point: 'center', delayed_discovery: 'decay spreading', visual_silence: '1/4 frame' },
    proposed_accident: 'peeling reveals',
    medium: 'photograph',
    generation_prompt: 'Generate.',
    seed_signature: 0.5
  };
  const critique = await provider.critiqueCandidate({ candidate, intention: { about: 'test', must_include: [], must_avoid: [] }, state: { motifs: {}, unresolved_tensions: [] }, constitution });
  const f2 = critique.shortcut_findings.find((f) => f.id === 'F2');
  assert.ok(f2, 'F2 shortcut should be detected when "decay" is in artifact_brief');
});

test('F3 shortcut fires when artifact_brief contains "symbol"', async () => {
  const provider = new DeterministicProvider();
  const candidate = {
    id: 'cand_test_F3',
    title: 'Test F3',
    strategy: 'False hospitality',
    artifact_brief: 'A symbol of power hangs over the entrance.',
    composition: { entry_point: 'entrance', delayed_discovery: 'symbol above', visual_silence: '1/4 frame' },
    proposed_accident: 'the symbol watches',
    medium: 'photograph',
    generation_prompt: 'Generate.',
    seed_signature: 0.5
  };
  const critique = await provider.critiqueCandidate({ candidate, intention: { about: 'test', must_include: [], must_avoid: [] }, state: { motifs: {}, unresolved_tensions: [] }, constitution });
  const f3 = critique.shortcut_findings.find((f) => f.id === 'F3');
  assert.ok(f3, 'F3 shortcut should be detected when "symbol" is in artifact_brief');
});

test('F4 shortcut (technical polish) is NEVER detected by deterministic provider — known gap', async () => {
  // F4 ("technical polish that removes material friction") has no text-match rule in critiqueCandidate.
  // It falls through the if-chain and returns false, making it dead in the deterministic provider.
  const provider = new DeterministicProvider();
  const candidate = {
    id: 'cand_test_F4',
    title: 'Test F4',
    strategy: 'Material contradiction',
    artifact_brief: 'Highly polished surfaces remove all material friction and human irregularity.',
    composition: { entry_point: 'surface', delayed_discovery: 'no texture', visual_silence: '1/4 frame' },
    proposed_accident: 'perfection as void',
    medium: 'photograph',
    generation_prompt: 'Generate.',
    seed_signature: 0.5
  };
  const critique = await provider.critiqueCandidate({ candidate, intention: { about: 'test', must_include: [], must_avoid: [] }, state: { motifs: {}, unresolved_tensions: [] }, constitution });
  const f4 = critique.shortcut_findings.find((f) => f.id === 'F4');
  assert.equal(f4, undefined, 'F4 is never detected — confirmed gap in deterministic provider');
});

test('F5 shortcut (suffering as spectacle) is NEVER detected by deterministic provider — known gap', async () => {
  const provider = new DeterministicProvider();
  const candidate = {
    id: 'cand_test_F5',
    title: 'Test F5',
    strategy: 'Peripheral evidence',
    artifact_brief: 'Suffering displayed as spectacle for maximum emotional impact.',
    composition: { entry_point: 'suffering figure', delayed_discovery: 'audience reaction', visual_silence: 'none' },
    proposed_accident: 'pain aestheticized',
    medium: 'photograph',
    generation_prompt: 'Generate.',
    seed_signature: 0.5
  };
  const critique = await provider.critiqueCandidate({ candidate, intention: { about: 'test', must_include: [], must_avoid: [] }, state: { motifs: {}, unresolved_tensions: [] }, constitution });
  const f5 = critique.shortcut_findings.find((f) => f.id === 'F5');
  assert.equal(f5, undefined, 'F5 is never detected — confirmed gap in deterministic provider');
});

// ─── SCORE THRESHOLD / PENALTY ───────────────────────────────────────────────

test('shortcut penalty subtracts from weighted score and can push candidate below threshold', () => {
  // Simulate a candidate near-threshold that shortcut detection pushes below it.
  const baseScores = { formal: 0.75, truth: 0.75, historical: 0.75, adversarial_survival: 0.75, productive_surprise: 0.75 };
  const weights = baseExperiment.weights;
  const base = weightedScore(baseScores, weights);
  const penaltyF1 = 0.18; // F1 penalty from constitution
  const penaltyF2 = 0.20; // F2 penalty
  const combinedPenalty = penaltyF1 + penaltyF2;
  const penalizedScore = roundScore(base - combinedPenalty);
  // base is 0.75, combined penalty 0.38 — should be well below canon_threshold of 0.7
  assert.ok(base > baseExperiment.canon_threshold, 'pre-penalty score should be above threshold');
  assert.ok(penalizedScore < baseExperiment.canon_threshold, 'post-penalty score should drop below threshold');
});

test('curator rejects a cycle when ALL candidates score below canon threshold with no revision window', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-threshold-'));
  // Set canon_threshold so high that nothing passes; disable revision to force reject_all
  const experiment = { ...structuredClone(baseExperiment), canon_threshold: 0.99, revision_threshold: 0.99 };
  const studio = new Studio({ rootDir, constitution, experiment });
  const result = await runCreativeCycle({ studio, provider: new DeterministicProvider(), observations, features: { revision: false } });
  assert.equal(result.curation.decision, 'reject_all');
  assert.equal(result.selected, null);
  assert.equal(result.state.rejected.length, 1, 'rejected array should record the cycle');
  assert.equal(result.state.canon.length, 0, 'canon should remain empty after refusal');
});

// ─── MAXIMUM_CANON_WORKS BUDGET (UNENFORCED — BUG) ───────────────────────────

test('maximum_canon_works budget is NOT enforced — cycles run past the limit', async () => {
  // The experiment.json has maximum_canon_works: 12, but creative-cycle.js only checks
  // maximum_cycles (cycle count), never maximum_canon_works. This test confirms the gap.
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-budget-'));
  const experiment = { ...structuredClone(baseExperiment), budgets: { ...baseExperiment.budgets, maximum_canon_works: 1 } };
  const studio = new Studio({ rootDir, constitution, experiment });
  const provider = new DeterministicProvider();
  await runCreativeCycle({ studio, provider, observations });
  const second = await runCreativeCycle({ studio, provider, observations });
  // Both cycles succeed regardless of maximum_canon_works=1
  assert.equal(second.state.cycle_count, 2, 'second cycle ran even though canon_works limit is 1');
  // If canon has >1 entry, the budget was clearly not enforced
  // (some cycles may be rejected; just confirm no Error was thrown)
  assert.ok(second.state.canon.length + second.state.rejected.length >= 2, 'two cycles completed without budget error');
});

// ─── MOTIF PRESSURE ON ATTENTION SELECTION ───────────────────────────────────

test('motif pressure causes an observation with matching motifs to score higher', async () => {
  const provider = new DeterministicProvider();

  // Build a state where 'domestic-space' is a known motif with high count
  const stateWithMotif = {
    cycle_count: 3,
    motifs: { 'domestic-space': 4 },
    observation_counts: {},
    active_surprises: [],
    unresolved_tensions: []
  };

  // obs-001 has tag 'domestic-space'; obs-004 does not
  const obs001 = observations.find((o) => o.id === 'obs-001'); // tags: domestic-space, identity, absence, femininity, mirror
  const obs004 = observations.find((o) => o.id === 'obs-004'); // tags: institution, language, exclusion, architecture

  const result = await provider.selectObservation({ observations, state: stateWithMotif, constitution });

  // Get the score for obs-001 vs obs-004 by running a fresh selectObservation on just those two
  const twoObs = await provider.selectObservation({ observations: [obs001, obs004], state: stateWithMotif, constitution });
  const selected = twoObs.observation.id;
  // obs-001 has 'domestic-space' which is in motifs; it should win under motif pressure
  assert.equal(selected, 'obs-001', 'observation with matching motif should score higher and be selected');
});

test('motif pressure is reduced by observation saturation (seen-count penalty)', async () => {
  const provider = new DeterministicProvider();
  // If an observation has been seen 3+ times its saturation penalty (0.17 * count) may exceed recurrence bonus
  const obs = observations[0];
  const stateHighSaturation = {
    cycle_count: 5,
    motifs: { 'domestic-space': 2, identity: 2 },
    observation_counts: { [obs.id]: 6 }, // seen 6 times → saturation = 6 * 0.17 = 1.02
    active_surprises: [],
    unresolved_tensions: []
  };
  const stateNoSaturation = {
    cycle_count: 5,
    motifs: { 'domestic-space': 2, identity: 2 },
    observation_counts: {},
    active_surprises: [],
    unresolved_tensions: []
  };

  const resultHigh = await provider.selectObservation({ observations: [obs], state: stateHighSaturation, constitution });
  const resultLow = await provider.selectObservation({ observations: [obs], state: stateNoSaturation, constitution });
  // With saturation, the score should be lower than without saturation
  assert.ok(resultHigh.score < resultLow.score, 'saturation penalty should reduce score relative to unsaturated state');
});

// ─── FORCED ACCEPTANCE ABLATION ──────────────────────────────────────────────

test('forced_acceptance condition overrides a reject_all decision', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-forced-'));
  // Raise threshold so curator would normally reject, but force acceptance
  const experiment = { ...structuredClone(baseExperiment), canon_threshold: 0.99, revision_threshold: 0.99 };
  const studio = new Studio({ rootDir, constitution, experiment });
  const result = await runCreativeCycle({
    studio,
    provider: new DeterministicProvider(),
    observations,
    condition: 'forced_acceptance',
    features: { refusal: false, revision: false }
  });
  // The condition flag should override the reject_all to accept
  assert.equal(result.curation.decision, 'accept', 'forced_acceptance should override reject_all');
  assert.ok(result.selected, 'a candidate should be selected even below threshold');
  assert.ok(result.curation.forced_by_condition, 'forced_by_condition flag should be set');
  const events = await studio.ledger.readAll();
  assert.ok(events.some((e) => e.type === 'curation_overridden_by_condition'), 'override event should be in ledger');
});

// ─── MEMORY ABLATION ─────────────────────────────────────────────────────────

test('memory ablation: real state accumulates motifs even when agents see empty history', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-ablation-'));
  const experiment = structuredClone(baseExperiment);
  const studio = new Studio({ rootDir, constitution, experiment });
  const provider = new DeterministicProvider();

  // Run a normal first cycle to build motifs
  await runCreativeCycle({ studio, provider, observations });
  const stateAfterFirst = await studio.getState();
  assert.ok(Object.keys(stateAfterFirst.motifs).length > 0, 'motifs should exist after first cycle');

  // Run an ablated second cycle
  await runCreativeCycle({ studio, provider, observations, ablateMemory: true });
  const stateAfterAblated = await studio.getState();

  // The real stored state still accumulates motifs — ablation only hides them from agents
  // This means the ablated run's consolidation still adds to motifs in state.
  // (For the deterministic provider, consolidateMemory receives the real state, not the ablated view.)
  assert.ok(Object.keys(stateAfterAblated.motifs).length >= Object.keys(stateAfterFirst.motifs).length,
    'motifs in stored state should still accumulate even when agents are ablated');
});

test('memory ablation: no_memory condition produces a valid cycle', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-nomem-'));
  const studio = new Studio({ rootDir, constitution, experiment: baseExperiment });
  const provider = new DeterministicProvider();
  // Seed some motifs first
  await runCreativeCycle({ studio, provider, observations });
  // Run under no_memory condition
  const result = await runCreativeCycle({
    studio,
    provider,
    observations,
    condition: 'no_memory',
    features: { autobiographicalMemory: false, surpriseCarryover: false }
  });
  assert.equal(result.verification.valid, true, 'ablated cycle should leave ledger valid');
  // active_surprises should be zero because surpriseCarryover is false
  assert.equal(result.memory.active_surprises.length, 0, 'surprises should be cleared when carryover is off');
});

// ─── ACTIVE_SURPRISES ROLLOFF ─────────────────────────────────────────────────

test('active_surprises are capped at 8 entries regardless of accepted cycles', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-surprises-'));
  // Use a low enough threshold that most cycles accept
  const experiment = { ...structuredClone(baseExperiment), canon_threshold: 0.5, revision_threshold: 0.3 };
  const studio = new Studio({ rootDir, constitution, experiment });
  const provider = new DeterministicProvider();

  for (let i = 0; i < 12; i++) {
    await runCreativeCycle({ studio, provider, observations });
  }
  const state = await studio.getState();
  assert.ok(state.active_surprises.length <= 8, `active_surprises should be capped at 8, got ${state.active_surprises.length}`);
});

// ─── UNRESOLVED_TENSIONS ROLLOFF ─────────────────────────────────────────────

test('unresolved_tensions are capped at 12 entries', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-tensions-'));
  const studio = new Studio({ rootDir, constitution, experiment: baseExperiment });
  const provider = new DeterministicProvider();

  for (let i = 0; i < 15; i++) {
    await runCreativeCycle({ studio, provider, observations });
  }
  const state = await studio.getState();
  assert.ok(state.unresolved_tensions.length <= 12, `unresolved_tensions should be capped at 12, got ${state.unresolved_tensions.length}`);
});

// ─── CONSTITUTION WEIGHT SUM ──────────────────────────────────────────────────

test('experiment weights are normalised — weightedScore always returns 0..1 regardless of weight values', () => {
  const scores = { formal: 1.0, truth: 1.0, historical: 1.0, adversarial_survival: 1.0, productive_surprise: 1.0 };
  const result = weightedScore(scores, baseExperiment.weights);
  assert.ok(result >= 0 && result <= 1, `weightedScore should be in [0,1], got ${result}`);
  assert.equal(result, 1.0, 'all-max scores should produce 1.0');
});

test('weightedScore returns 0 when all scores are 0', () => {
  const scores = { formal: 0, truth: 0, historical: 0, adversarial_survival: 0, productive_surprise: 0 };
  assert.equal(weightedScore(scores, baseExperiment.weights), 0);
});

test('missing score dimension defaults to 0, lowering the weighted score', () => {
  const fullScores = { formal: 0.8, truth: 0.8, historical: 0.8, adversarial_survival: 0.8, productive_surprise: 0.8 };
  const partialScores = { formal: 0.8, truth: 0.8, historical: 0.8 }; // missing adversarial_survival and productive_surprise
  const full = weightedScore(fullScores, baseExperiment.weights);
  const partial = weightedScore(partialScores, baseExperiment.weights);
  assert.ok(partial < full, 'missing dimensions should default to 0 and lower the score');
});

// ─── INTENTION LOCK IS HASHED ─────────────────────────────────────────────────

test('intention hash changes when intention content changes', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'haunted-hash-'));
  const studio = new Studio({ rootDir, constitution, experiment: baseExperiment });
  const provider = new DeterministicProvider();
  const result1 = await runCreativeCycle({ studio, provider, observations: [observations[0]] });
  const result2 = await runCreativeCycle({ studio, provider, observations: [observations[1]] });
  // Different observations produce different necessity/intention → different hashes
  assert.notEqual(result1.intentionHash, result2.intentionHash,
    'different observations should produce different intention hashes');
});

// ─── OPENAI CURATION THRESHOLD BYPASS (CONTRACT TEST) ────────────────────────

test('curator-agent does NOT re-validate that OpenAI score meets canon_threshold — known bypass', async () => {
  // The curator-agent.js only checks decision enum and candidate existence.
  // If OpenAI returns decision:'accept' with score:0.01, it is accepted.
  // This test uses a fake provider to prove the bypass.
  const { curate } = await import('../src/agents/curator-agent.js');
  const candidates = [{ id: 'cand_A', title: 'A', strategy: 's', artifact_brief: 'b', generation_prompt: 'g' }];
  const critiques = [{ candidate_id: 'cand_A', scores: {}, confidence: 0.9, strongest_objection: 'none', revision: 'none', shortcut_findings: [] }];
  const fakeProvider = {
    curate: async () => ({
      decision: 'accept',
      selected_candidate_id: 'cand_A',
      score: 0.01,         // way below canon_threshold of 0.7
      threshold: 0.7,
      rationale: 'LLM decided to accept regardless',
      conditions: [],
      ranking: []
    })
  };
  const result = await curate({
    provider: fakeProvider,
    candidates,
    critiques,
    intention: { about: 'test' },
    state: {},
    constitution,
    experiment: baseExperiment,
    allowRevision: false
  });
  // This passes — demonstrating that the threshold is not re-validated
  assert.equal(result.decision, 'accept', 'curator-agent accepts LLM decision without threshold re-check');
  assert.equal(result.score, 0.01, 'sub-threshold score is accepted when OpenAI provider is used');
});
