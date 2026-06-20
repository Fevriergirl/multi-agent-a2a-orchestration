/**
 * Independent, artifact-based shortcut detection.
 *
 * The fidelity auditor must verify against the ARTIFACT, never against the
 * maker's report of the artifact. These signatures inspect the artifact's own
 * descriptive prose for evidence that a forbidden shortcut was actually taken.
 * They read no self-reported critique field, so a maker cannot conceal a
 * violation simply by leaving it out of `shortcut_findings`.
 *
 * Field boundary: we scan the prose that DESCRIBES the work (brief, strategy,
 * title, the proposed accident, the delayed discovery). We deliberately exclude
 * `generation_prompt` and `composition.visual_silence`, because both carry
 * avoidance / negation language ("Avoid horror-poster lighting", "no symbolic
 * explanation"). Scanning those would conflate "must not contain X" with
 * "contains X" and would fire on honest work — the same boundary the critic
 * itself respects when it self-reports.
 *
 * Coverage: F1/F2/F3 have committed textual signatures. F4/F5 have no agreed
 * textual signature, and F6 is a cross-cycle motif-reuse judgment that cannot
 * be decided from a single artifact's text. Those are returned as
 * `undetectable` so the caller can distinguish "checked, clean" from
 * "not checkable from text alone" — and never silently report them as kept.
 */

const TEXT_SIGNATURES = {
  F1: (text) => text.includes('cinematic lighting'),
  F2: (text) => text.includes('decay') || text.includes('distressed'),
  F3: (text) => text.includes('symbol')
};

/**
 * The single definition of "the artifact's descriptive prose." Both motif and
 * shortcut detection scan exactly this surface, so the two dimensions can never
 * disagree about what counts as the artifact's own words.
 */
export function artifactProse(candidate) {
  return [
    candidate.artifact_brief,
    candidate.strategy,
    candidate.title,
    candidate.composition?.delayed_discovery,
    candidate.proposed_accident
  ].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Detect, from the artifact's prose alone, which of the given forbidden
 * shortcut ids the artifact actually commits.
 *
 * @returns {{ detected: string[], undetectable: string[] }}
 *   detected     — forbidden ids whose textual signature is present
 *   undetectable — forbidden ids with no textual signature (cannot be judged here)
 */
export function detectShortcutsInArtifact(candidate, shortcutIds = []) {
  const text = artifactProse(candidate);
  const detected = [];
  const undetectable = [];
  for (const shortcutId of shortcutIds) {
    const signature = TEXT_SIGNATURES[shortcutId];
    if (!signature) {
      undetectable.push(shortcutId);
      continue;
    }
    if (signature(text)) detected.push(shortcutId);
  }
  return { detected, undetectable };
}
