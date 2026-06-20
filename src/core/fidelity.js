/**
 * Intention fidelity checking.
 *
 * All four dimensions map directly onto the structured fields added to the
 * locked intention in Stage 1. No provider call is needed — the data is already
 * present in the candidate and its critique.
 */

import { artifactProse, detectShortcutsInArtifact } from './shortcut-detection.js';

function getNestedValue(obj, dotPath) {
  return dotPath.split('.').reduce((current, key) => current?.[key], obj);
}

function wordSet(text) {
  return new Set(String(text ?? '').toLowerCase().split(/\W+/).filter(Boolean));
}

function jaccardOverlap(textA, textB) {
  const setA = wordSet(textA);
  const setB = wordSet(textB);
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check the four checkable dimensions of a locked intention against
 * actual candidate output and its critique.
 *
 * Returns a fidelityRecord with per-claim results. The caller must set
 * fidelityRecord.intention_hash from the frozen hash.
 */
export function checkFidelity(lockedIntention, candidate, critique) {
  const claims = [];

  // ── Dimension 1: target_motifs ────────────────────────────────────────────
  // The intention declared which observation tags the work must engage.
  // We search the candidate's text for each tag (hyphenated and spaced forms).
  const targetMotifs = lockedIntention.target_motifs ?? [];
  const candidateText = artifactProse(candidate);

  const observedMotifs = targetMotifs.filter((motif) => {
    const normalized = motif.toLowerCase().replaceAll('-', ' ');
    return candidateText.includes(normalized) || candidateText.includes(motif.toLowerCase());
  });
  const missingMotifs = targetMotifs.filter((m) => !observedMotifs.includes(m));
  const motifsResult = missingMotifs.length === 0 ? 'kept'
    : observedMotifs.length > 0 ? 'partial'
    : 'broken';

  claims.push({
    dimension: 'target_motifs',
    intended: targetMotifs,
    actual: observedMotifs,
    missing: missingMotifs,
    result: motifsResult
  });

  // ── Dimension 2: forbidden_shortcut_ids ───────────────────────────────────
  // Verify against the ARTIFACT, not the maker's report of it. We independently
  // scan the artifact's prose for each forbidden shortcut (authoritative), and
  // read the critique's self-reported shortcut_findings only as a SECONDARY
  // signal. The two combine by UNION: a self-report can ADD a violation the
  // text scan can't see (e.g. a cross-cycle F6), but it can never SUPPRESS one
  // the artifact reveals. A maker that omits its own violation is still caught.
  const forbiddenIds = lockedIntention.forbidden_shortcut_ids ?? [];
  const forbiddenIdSet = new Set(forbiddenIds);

  const { detected: independentlyDetected, undetectable } =
    detectShortcutsInArtifact(candidate, forbiddenIds);

  const selfReported = (critique?.shortcut_findings ?? [])
    .map((f) => f.id)
    .filter((id) => forbiddenIdSet.has(id));

  const violatedIds = [...new Set([...independentlyDetected, ...selfReported])].sort();
  // Detected from the artifact but absent from the self-report: a concealment
  // attempt the artifact betrayed anyway.
  const concealed = independentlyDetected.filter((id) => !selfReported.includes(id));
  const shortcutsResult = violatedIds.length === 0 ? 'kept' : 'broken';

  claims.push({
    dimension: 'forbidden_shortcuts',
    intended_forbidden: [...forbiddenIdSet],
    violations_found: violatedIds,
    independently_detected: independentlyDetected,
    self_reported: selfReported,
    concealed,
    undetectable_from_text: undetectable,
    result: shortcutsResult
  });

  // ── Dimension 3: binding_constraint ───────────────────────────────────────
  // The intention specified one falsifiable structural claim: a test_field on
  // the candidate and a list of forbidden_terms that would break the claim.
  const bc = lockedIntention.binding_constraint;
  let constraintResult = 'kept';
  let testFieldValue = null;
  let forbiddenTermsFound = [];

  if (bc?.test_field && Array.isArray(bc?.forbidden_terms)) {
    testFieldValue = String(getNestedValue(candidate, bc.test_field) ?? '').toLowerCase();
    forbiddenTermsFound = bc.forbidden_terms.filter((term) =>
      testFieldValue.includes(term.toLowerCase())
    );
    constraintResult = forbiddenTermsFound.length > 0 ? 'broken' : 'kept';
  }

  claims.push({
    dimension: 'binding_constraint',
    claim: bc?.claim ?? null,
    test_field: bc?.test_field ?? null,
    test_field_value: testFieldValue,
    forbidden_terms_found: forbiddenTermsFound,
    result: constraintResult
  });

  // ── Dimension 4: audience_encounter_prediction ────────────────────────────
  // The intention predicted what the viewer would notice first. We compare it
  // to the actual composition.entry_point using Jaccard word overlap.
  const predicted = lockedIntention.audience_encounter_prediction ?? '';
  const actual = String(getNestedValue(candidate, 'composition.entry_point') ?? '');
  const overlapScore = Math.round(jaccardOverlap(predicted, actual) * 1000) / 1000;
  const audienceResult = overlapScore >= 0.4 ? 'kept'
    : overlapScore >= 0.15 ? 'partial'
    : 'broken';

  claims.push({
    dimension: 'audience_encounter',
    predicted,
    actual,
    overlap_score: overlapScore,
    result: audienceResult
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const kept = claims.filter((c) => c.result === 'kept').length;
  const broken = claims.filter((c) => c.result === 'broken').length;
  const partial = claims.filter((c) => c.result === 'partial').length;

  return {
    intention_hash: null, // caller sets this from the frozen hash
    checked_candidate_id: candidate.id,
    claims,
    summary: { total_claims: claims.length, kept, broken, partial }
  };
}
