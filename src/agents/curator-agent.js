export async function curate({ provider, candidates, critiques, intention, state, constitution, experiment, allowRevision = false }) {
  const decision = await provider.curate({ candidates, critiques, intention, state, constitution, experiment, allowRevision });
  if (!['accept', 'revise', 'reject_all'].includes(decision?.decision)) {
    throw new Error(`Invalid curator decision: ${decision?.decision}`);
  }
  if (decision.decision !== 'reject_all' && !candidates.some((candidate) => candidate.id === decision.selected_candidate_id)) {
    throw new Error('Curator selected a candidate that does not exist.');
  }

  // Enforce canon threshold regardless of provider. The deterministic path already enforces
  // this internally; for the OpenAI path this closes the bypass where the model can return
  // decision:'accept' with a score it computed below threshold.
  if (
    decision.decision === 'accept' &&
    typeof decision.score === 'number' &&
    typeof experiment?.canon_threshold === 'number' &&
    decision.score < experiment.canon_threshold
  ) {
    throw new Error(
      `Curator accepted below canon threshold: score ${decision.score} < ${experiment.canon_threshold}. ` +
      `The committed intention hash requires this boundary to hold.`
    );
  }

  return decision;
}
