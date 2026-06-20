import { requireArray, requireObject, requireString } from '../core/validation.js';

export async function formAndLockIntention({ provider, observation, state, constitution }) {
  const necessity = requireObject(await provider.formNecessity({ observation, state, constitution }), 'necessity');
  requireString(necessity.statement, 'necessity.statement');
  requireArray(necessity.pressure_sources, 'necessity.pressure_sources');
  requireString(necessity.failure_if_unmade, 'necessity.failure_if_unmade');

  const intention = requireObject(await provider.lockIntention({ observation, necessity, state, constitution }), 'intention');
  for (const key of ['about', 'viewer_encounter', 'formal_tension', 'anticipated_risk', 'revision_question']) {
    requireString(intention[key], `intention.${key}`);
  }
  requireArray(intention.must_include, 'intention.must_include');
  requireArray(intention.must_avoid, 'intention.must_avoid');

  // Checkable commitment fields — must be present and machine-testable before generation.
  requireArray(intention.target_motifs, 'intention.target_motifs');
  requireArray(intention.forbidden_shortcut_ids, 'intention.forbidden_shortcut_ids');
  requireObject(intention.binding_constraint, 'intention.binding_constraint');
  requireString(intention.binding_constraint.claim, 'intention.binding_constraint.claim');
  requireString(intention.binding_constraint.test_field, 'intention.binding_constraint.test_field');
  requireArray(intention.binding_constraint.forbidden_terms, 'intention.binding_constraint.forbidden_terms');
  requireString(intention.audience_encounter_prediction, 'intention.audience_encounter_prediction');

  return { necessity, intention };
}

export async function makeCandidates({ provider, observation, necessity, intention, state, constitution, experiment, cycleId }) {
  const candidates = await provider.generateCandidates({
    observation,
    necessity,
    intention,
    state,
    constitution,
    count: experiment.candidate_count,
    cycleId
  });
  requireArray(candidates, 'candidates');
  if (candidates.length === 0) throw new Error('Artist agent returned no candidates.');
  const ids = new Set();
  for (const [index, candidate] of candidates.entries()) {
    requireObject(candidate, `candidates[${index}]`);
    for (const key of ['id', 'title', 'strategy', 'artifact_brief', 'generation_prompt']) {
      requireString(candidate[key], `candidates[${index}].${key}`);
    }
    if (ids.has(candidate.id)) throw new Error(`Duplicate candidate id: ${candidate.id}`);
    ids.add(candidate.id);
  }
  return candidates.slice(0, experiment.budgets.maximum_candidates_per_cycle);
}
