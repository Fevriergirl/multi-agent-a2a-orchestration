# Fidelity State Audit

**Date:** 2026-06-20  
**Branch inspected:** `claude/haunted-studio-audit-bv0hju`  
**Auditor:** Independent audit pass — principal engineer + adversarial reviewer roles combined  
**Working tree state:** Clean — `git status` reports nothing to commit

---

## 1. Exact Repository State

### Branches

| Branch | Head commit | Status |
|--------|------------|--------|
| `main` | `bee2640` Build Haunted Studio v.0.3.0 | Protected base |
| `cleanup/haunted-studio-identity` | `926802d` Clarify Haunted Studio identity | Open as PR #1 |
| `claude/haunted-studio-audit-bv0hju` | `08af96b` Close concealed-violation hole | Not yet a PR — 3 commits ahead of main |

### Open Pull Requests

**PR #1** — "Clarify Haunted Studio identity and preserve provenance"  
- Base: `main` → Head: `cleanup/haunted-studio-identity`  
- Scope: docs, package identity, `src/cli.js` (reset→archive), `src/core/studio.js` (archive method), `test/archive.test.js`  
- Created 2026-06-20, author Fevriergirl

**There is no PR #4.** The task specification references "open PR #4" — this PR does not exist in the repository. The task also references "PR 2A" — this does not exist. These appear to be designations from a planning document, not existing repository objects.

### Referenced Documents That Do Not Exist

The following documents are required by the task specification but are absent from the repository:

- `docs/POST-RESULT-EVIDENCE-DESIGN.md` — **does not exist**
- `docs/LOGIC-AUDIT.md` — **does not exist**

Consequently, the requested comparison against PR 2A's stated scope and against these documents cannot be performed. The audit proceeds against the available evidence: the actual code, the existing docs, and the current ledger schema.

### Fidelity Work: Files Changed

The 3 commits on `claude/haunted-studio-audit-bv0hju` since `main` changed these files:

**Commit `fecb425`** (constraint tests):
- `test/constraints.test.js` (new file — 20 tests for shortcut detection, scoring, canon threshold, memory)

**Commit `f476b35`** (intention verification loop):
- `src/agents/artist-agent.js` — 4 new required intention fields
- `src/agents/curator-agent.js` — closes OpenAI canon-threshold bypass
- `src/core/fidelity.js` (new file — `checkFidelity()` pure function)
- `src/engine/creative-cycle.js` — wires fidelity check into cycle, 3 new ledger event types
- `src/providers/deterministic-provider.js` — supplies 4 new fields in `lockIntention`
- `src/providers/openai-provider.js` — instructs model to supply 4 new fields
- `test/fidelity.test.js` (new file — 3 tests: hash recomputation, honoring, violation)

**Commit `08af96b`** (concealed-violation detection):
- `src/core/shortcut-detection.js` (new file — independent artifact-prose scanner)
- `src/core/fidelity.js` — imports shortcut-detection; Dimension 2 rewritten to union independent scan with self-report
- `test/fidelity.test.js` — adds 4th test (concealing provider with empty self-report)

### Is Fidelity Work Mixed with PR #1?

**No.** The two branches diverge from `main` independently. File-level analysis confirms zero overlap:

- PR #1 files: `.gitignore`, `CHANGELOG.md`, `PROJECT-AUDIT.md`, `README.md`, `docs/A2A-ORIGIN.md`, `docs/EXPERIMENT-PROTOCOL.md`, `docs/MOBILE-SETUP.md`, `docs/archive/MULTI-AGENT-A2A-ORCHESTRATION.md`, `package.json`, `package-lock.json`, `src/cli.js`, `src/core/studio.js`, `test/archive.test.js`
- Fidelity branch files: all under `src/agents/`, `src/core/fidelity.js`, `src/core/shortcut-detection.js`, `src/engine/creative-cycle.js`, `src/providers/`, `test/constraints.test.js`, `test/fidelity.test.js`

The fidelity work does not contaminate PR #1. They can be reviewed and merged independently.

---

## 2. Does the Fidelity Work Alter Research Semantics?

**Yes, substantially.** The following changes to research semantics were introduced and are not yet disclosed in any PR:

### New required intention fields (breaking schema change for replayed old cycles)

`artist-agent.js` now calls `requireArray` and `requireObject` on four fields that did not exist in any cycle before this branch. The four fields are:

- `intention.target_motifs` — array of observation tags the work must address
- `intention.forbidden_shortcut_ids` — array of shortcut IDs forbidden this cycle
- `intention.binding_constraint` — object with `claim`, `test_field`, `forbidden_terms`
- `intention.audience_encounter_prediction` — string

Old ledgers remain readable (the append-only property is preserved). However, if any replay or validation code attempted to re-run `formAndLockIntention` against a pre-branch intention record, it would throw on the missing fields. This is a validation-layer backward compatibility break.

### Three new ledger event types

`creative-cycle.js` emits three new event types not defined in any schema document:

- `intention_fidelity_checked` — emitted once per cycle after fidelity evaluation
- `intention_violated` — emitted once per broken claim, referencing `intention_hash`
- `refusal_fidelity_checked` — emitted when `curation.decision === 'reject_all'`

These event types are undocumented. They appear in ledger files but have no versioned schema, no field specification, and no documented migration path.

### New per-cycle file

`fidelity.json` is now written to every cycle directory. Old cycle directories do not have this file. Code that assumes its presence would break against legacy run directories.

### Canon-eligibility semantics unchanged — and that is a problem

`fidelityRecord` is stored in the manifest and returned from `runCreativeCycle`, but it gates **nothing**. A cycle where `fidelityRecord.summary.broken > 0` can still be accepted into canon. A cycle with multiple `intention_violated` ledger events enters `state.canon` identically to a clean cycle. The fidelity check is currently observational only; it does not produce any effect on the selection path.

---

## 3. Is `checkFidelity` Provider-Agnostic?

**At the function level: yes.** `checkFidelity(lockedIntention, candidate, critique)` takes plain objects and contains no provider-specific branching. It runs identically regardless of which provider generated the inputs.

**At the input level: partially.** The four required intention fields depend on the provider populating them:
- The deterministic provider uses hardcoded templates; field presence is guaranteed.
- The OpenAI provider is instructed via prompt string to include the fields; presence is enforced by the `requiredKeys` check in `requestJson`, but field *content* (e.g. whether the model chose legitimate forbidden_shortcut_ids from the constitution) is model-determined and uncheckable.

**At the scan surface level: yes, with one caveat.** `artifactProse()` reads the same fields regardless of provider. However, for the OpenAI provider, both the candidate prose and the critique that accompanies it are generated by the same model, creating same-model circularity: a sufficiently capable model could write its `artifact_brief` to avoid all detection signatures while describing a work that, if actually generated, would exhibit the forbidden feature.

---

## 4. Is It Artifact-Derived or Artifact-Description-Derived?

**Artifact-description-derived.** The claim "verify against the ARTIFACT" is not satisfied by the current implementation.

`artifactProse()` reads these fields, all written by the model-as-maker:
- `candidate.artifact_brief` — what the model wrote describing the concept
- `candidate.strategy` — one of 5 fixed strings (deterministic) or a model-generated description
- `candidate.title`
- `candidate.composition.delayed_discovery`
- `candidate.proposed_accident`

No image bytes are read. The SHA-256 hash of any generated image is not computed. No pixel-level analysis is performed. The "independent" detection is independent of the critique, but it remains a model-written text scan.

This is a meaningful improvement over the prior state (trusting the self-report alone), but it does not constitute artifact-level verification. A generated image could visibly exhibit cinematic lighting while the `artifact_brief` describes only peripheral evidence structures. The actual artifact — the image — is uninspected.

The commit message's claim "verify against the ARTIFACT, not the maker's report of the artifact" is accurate only in the limited sense that we read a different self-authored field (prose intent) rather than the self-evaluation field (critique). Both originate from the same model.

---

## 5. Conceal Paths Still Available to the Maker

The following conceal paths remain open after the current implementation:

| Attack vector | Example | Current behavior |
|---|---|---|
| **Synonym** | "filmic key light" instead of "cinematic lighting" | F1 scan misses; self-report controls |
| **Displacement** | F1 committed only in `generation_prompt` (excluded field) | Scan misses; may be caught only if OpenAI model self-reports |
| **Paraphrase** | "soft dramatic falloff" for F1 | Scan misses entirely |
| **Empty prose fields** | `artifact_brief: ""` | Scan returns nothing; no F1/F2/F3 detection; result is vacuously `kept` |
| **Negation false positive** | "The work rejects cinematic lighting" | Scan fires F1 spuriously (confirmed false positive path — see §6) |
| **Quotation false positive** | "The artist said 'cinematic lighting' but rejected it" | Scan fires F1 spuriously |
| **F4 concealment** | Any technical-polish violation | No signature; reported `undetectable` but unaddressed in claims |
| **F5 concealment** | Any suffering-as-spectacle violation | No signature; same |
| **F6 concealment** | Cross-cycle motif reuse | Requires cross-cycle evidence; current cycle scope cannot evaluate |
| **Split phrase** | "cinematic" in title, "lighting" in proposed_accident | Scan joins on space but split across separate fields could defeat phrase match |
| **Unicode confusable** | U+0441 (Cyrillic с) instead of ASCII 'c' in "сinematic" | `includes()` is byte-level; confusables bypass detection |
| **Empty audited fields** | `composition.entry_point: ""` | Binding constraint and audience_encounter both pass vacuously |
| **Field displacement** | Forbidden term in `composition.visual_silence` (excluded) | Scan misses by design; also misses if placed in `medium` |

---

## 6. Can the Independent Detector Produce False Convictions?

**Yes, confirmed.** The following produce false positives with the current implementation:

### F3: `text.includes('symbol')`

Any artifact_brief that discusses symbolism critically — e.g. "The work refuses to deploy symbol as explanation" — triggers F3. The word "symbolic" appears in explanations of what the work avoids. The field exclusion of `visual_silence` prevents the specific string "symbolic explanation" from firing, but a candidate that says "We reject the symbolic logic of X" fires F3 incorrectly.

### F2: `text.includes('decay')`

"The room documents the decay of domestic routine" is a content description, not decorative decay. "decay" as a verb or subject of analysis triggers F2 even when the artist is examining decay as a subject rather than deploying it as surface.

### F1: `text.includes('cinematic lighting')`

"The brief deliberately avoids cinematic lighting effects" in `artifact_brief` fires F1. The field boundary protects `generation_prompt` ("Avoid cinematic lighting") but not all negation contexts within the audited fields.

### Binding constraint false positive

The binding constraint is fully maker-designed. A deliberately constructed `forbidden_terms` array that matches common words would produce false positive claims against any work. There is no validation that `forbidden_terms` items are not trivially broad.

### Audience overlap false negative

A Jaccard overlap of exactly 0.399 classifies audience prediction as `broken` while 0.400 classifies it as `kept`. This threshold has no empirical justification. The `partial` band (0.15–0.399) is particularly wide.

---

## 7. F1–F6 Classification by Evidence Layer

The current implementation does not document this classification explicitly. The following is the independent assessment:

| Rule | Constitution text | Text-layer detection | Can text detect? | Evidence layers capable | False positive risk | False negative risk | Work-local or cross-cycle | Human required |
|------|-----|------|------|------|------|------|------|------|
| **F1** | Generic cinematic lighting used as substitute for meaning | Yes — `includes('cinematic lighting')` | Partially — exact phrase only | Layer 2 (partial), Layer 4 (blind visual), Layer 7 (human) | High — negation, avoidance language in prose | High — synonyms, displacement, paraphrase | Work-local | For confirmation |
| **F2** | Decorative decay or surrealism with no structural purpose | Yes — `includes('decay')` or `includes('distressed')` | Partially — "decorative" qualifier is ignored; raw word match only | Layer 2 (partial), Layer 4, Layer 7 | High — decay as subject, structural decay descriptions | High — alternative vocabulary, structural surrealism | Work-local | For "structural purpose" judgment |
| **F3** | Symbols that explain themselves immediately | Yes — `includes('symbol')` | Poorly — "symbol" appears in critical and avoidance language constantly | Layer 2 (poor), Layer 4, Layer 7 | Very high — any discussion of symbolic meaning | High — non-"symbol" vocabulary for literal explanatory symbols | Work-local | Yes, required |
| **F4** | Technical polish that removes material friction or human irregularity | No — no signature | No | Layer 3 (image technical analysis), Layer 4, Layer 7 | N/A | Certain — no detection attempted | Work-local | Yes, required |
| **F5** | Suffering used as spectacle | No — no signature | No | Layer 4, Layer 7 | N/A | Certain — no detection attempted | Work-local | Yes, required |
| **F6** | Repeating a successful motif without changing its stakes | Theoretically — only via `historicalRepeat > 2` in provider, not in fidelity | No | Layer 8 (cross-cycle experiment), Layer 7 | N/A | Certain in current fidelity check | Cross-cycle | Yes, required |

The current implementation classifies F4, F5, and F6 as `undetectable_from_text` in the data returned by `detectShortcutsInArtifact`. This is accurate. However, `undetectable_from_text` does not propagate into fidelity claims in a way that prevents the overall dimension result from being `kept` when none are detected. The claim reads: `result: 'kept'` when `violatedIds.length === 0` — which happens both when genuinely clean and when nothing was detectable. These states are indistinguishable in the `result` field.

---

## 8. Can a Finding Enter Memory or Canon Before Adjudication?

**Yes — unconditionally.** There is no gate.

`creative-cycle.js` computes `fidelityRecord` after curation but before memory consolidation and before writing to `state.canon`. The `fidelityRecord` has no effect on either path:

- **Canon:** `state.canon` is appended when `curation.decision === 'accept'` regardless of `fidelityRecord.summary.broken`. A cycle that violated two commitments can be accepted into canon.
- **Memory:** `consolidate()` receives no fidelity information. Memory is updated regardless of fidelity outcome.
- **`intention_violated` events:** Written to the ledger immediately, before canon write, with no challenge or review period. The event name "violated" implies conviction, but no adjudication has occurred.

---

## 9. Traceability: Intention Hash, Artifact Hash, Evidence Source, Detector Version

| Traceable item | Present? | Notes |
|---|---|---|
| Intention content hash | Yes | `intention_hash` is SHA-256 of canonical JSON of `intentionRecord`; carried in every fidelity event |
| Artifact hash | **No** | No hash of the generated image is computed anywhere |
| Evidence source (which fields were scanned) | Partial | `artifactProse()` field list is defined in code but not recorded in the fidelity record |
| Detector name | **No** | No `detector_name` or `detector_version` field in fidelity records |
| Detector version | **No** | No versioning of detection signatures |
| Provider/model identifier | **No** | Not recorded in fidelity records; available only at cycle level in ledger |
| Schema version | **No** | Fidelity record has no schema version field |

---

## 10. Missing Required Data Model Fields

The fidelity record schema lacks all of the following fields required for adequate traceability and adjudication:

- `finding_id` — unique identifier per claim instance
- `evidence_layer` — which layer produced each signal
- `confidence` — no confidence value on any claim
- `challenge_status` — no mechanism exists to challenge a finding
- `adjudication_status` — signals flow directly to `result`; no intermediate state
- `adjudicator_identity` — no adjudicator concept exists
- `schema_version` — no versioning
- `eligibility_for_memory` — not computed
- `eligibility_for_canon_decision` — not computed
- `known_limitations` — not recorded
- `detector_name`, `detector_version` — not recorded
- `artifact_id`, `artifact_hash` — not recorded
- Timestamps on individual claims — not recorded

---

## 11. Undocumented Assumptions and Inert Fields

### Undocumented assumptions

1. `artifactProse()` field boundary is a design choice (exclude `generation_prompt` and `visual_silence`) with no unit test proving that negation in those fields does not change claim results.
2. Jaccard overlap threshold of 0.4 for `audience_encounter` is undocumented and unjustified.
3. `partial` claim result is defined for `target_motifs` and `audience_encounter` but is treated identically to `kept` in all downstream logic (it does not appear in the `broken` count and therefore never triggers an `intention_violated` event).
4. The four new intention fields are required at validation time but the content is not validated beyond type. A model that returns `forbidden_shortcut_ids: []` would disable all shortcut checking with no alert.
5. `binding_constraint.forbidden_terms` is maker-supplied; the maker can choose terms that never appear in any work, making the constraint always `kept`.

### Inert fields

- `result.fidelityRecord` is in the return value and in `manifest.json` but has no downstream gate effect.
- `undetectable_from_text` in each shortcut claim is recorded but never acted upon by any downstream logic.
- `concealed` array in shortcut claims is recorded but triggers no distinct ledger event.
- `self_reported` is recorded but not used to weight or qualify the overall violation result.

---

## 12. Ledger and Schema Compatibility

### Forward compatibility (old ledgers with new code)

**Safe.** Old ledger events (`cycle_started`, `intention_locked`, etc.) are still readable. New code adds new event types but does not modify old ones. `ledger.verify()` only checks the hash chain, not event schemas. Old cycles simply lack `intention_fidelity_checked` events.

### Backward compatibility (new ledgers with old code)

**Untested but likely safe** for old code reading ledger files — old code would see unknown event types and ignore them. However, if old code tried to `rebuildStateFromLedger()` and the reconstruction logic required specific event types, it could fail.

### Replay compatibility

**Broken for old cycles.** If any code attempted to replay or re-derive an old cycle's intention through `formAndLockIntention`, the new `requireArray(intention.target_motifs, ...)` validation would throw because old intentions lack these fields. This is not currently a code path (replay reconstructs from stored events, not by re-running agents), but it is a brittle assumption.

---

## 13. Security and Integrity Risks

### Unicode confusables

`includes()` uses exact byte comparison. Unicode confusable characters (e.g. Cyrillic `с` for ASCII `c`, homoglyph digits) in artifact_brief would bypass all text signatures. No normalization is applied.

### Prompt injection

`artifact_brief` and other scanned fields could contain adversarial instructions if the provider receives user-supplied observation text that is not sanitized. The text scanner applies pattern matches; this is not a code execution risk, but a model receiving concatenated fields could be manipulated if the adversarial text is in the prompt context.

### Empty fields

`artifact_brief: ""` or `artifact_brief: null` produces `artifactProse() = ""`, which matches no signatures. The result is `undetectable` for all shortcuts and `broken` for motifs (if target_motifs is non-empty and none appear in empty text). There is no alert that the prose surface was empty.

### Binding constraint self-specification

The maker specifies `binding_constraint.forbidden_terms`. A maker that provides `forbidden_terms: []` (an empty array) or `forbidden_terms: ["xyzzy"]` (an impossible term) always passes. This is a maker-controlled escape hatch.

### Path traversal

`studio.writeCycleFile(cycleId, 'fidelity.json', ...)` uses `cycleId` in the path. `cycleId` is generated by `id('cycle')` which produces a safe random ID. No user input reaches this path directly. Risk is low.

---

## 14. Signal Conflated with Conviction

**This is the central structural problem with the current implementation.**

The current pipeline is:

```
substring match → result: 'broken' → intention_violated ledger event
```

What it should be, per the governing principle:

```
substring match → signal_detected → possible_violation
                                   → adversarial_challenge
                                   → confirmed / rejected / unresolved
```

The word "violated" in `intention_violated` implies a concluded finding. No challenge occurred. No adjudicator reviewed the signal. No intermediate state exists. A negated phrase that triggers F3 produces an `intention_violated` ledger event with `result: "broken"` indistinguishable from a genuine confirmed violation.

---

## 15. PR Separation Recommendation

**The fidelity branch should not be merged as-is.** It is not mixed with PR #1 (that is fine), but the branch itself mixes two work categories that should be separated:

1. **Infrastructure the Fidelity PRs depend on**: The 4 new intention fields in artist-agent.js and both providers; the curator threshold fix. These are low-risk changes that enable fidelity checking. They could be extracted into a separate preparatory PR.

2. **The current fidelity implementation**: `checkFidelity()`, `shortcut-detection.js`, the wiring in `creative-cycle.js`, `test/fidelity.test.js`. This work produces a working but epistemically over-confident detection loop. It should be restructured — not discarded — as Fidelity PR A, with the signal/allegation/adjudication separation required by the task.

**Specific recommendation:**

- Open PR #1 (`cleanup/haunted-studio-identity`) for review and merge now. It is clean and non-conflicting.
- Do **not** open the fidelity branch as a PR yet.
- Create `research/fidelity-adjudication` from updated main after PR #1 merges.
- Port the fidelity branch's preparatory work (4 fields, threshold fix) and then restructure the detection/adjudication model.
- The existing tests (`test/fidelity.test.js`, `test/constraints.test.js`) are valuable as a starting corpus; update them to reflect the signal/allegation/adjudication model.

---

## Summary Answers to Required Questions

| Question | Answer |
|---|---|
| Is fidelity work improperly mixed with PR #4? | PR #4 does not exist. Fidelity work is not mixed with PR #1. |
| Does any new code alter research semantics not disclosed by a PR? | Yes — 3 new ledger event types, 4 new required intention fields, new fidelity.json per cycle. None are in a PR yet. |
| Is `checkFidelity` provider-agnostic? | At the function level yes; at the input level, model compliance with required fields is uncheckable for OpenAI. |
| Is it artifact-derived or artifact-description-derived? | Artifact-description-derived. No image bytes are inspected. |
| Can the maker omit, displace, paraphrase, negate, quote, or obfuscate evidence? | Yes — all of these paths remain open (see §5). |
| Can the independent detector produce false convictions? | Yes — F1 fires on negation; F3 fires on critical discussion of symbols; F2 fires on analytical use of "decay" (see §6). |
| Are F1–F6 classified by evidence layer? | In code, partially (detected vs. undetectable_from_text). In documentation, no. Full classification provided in §7. |
| Can a finding enter memory or canon before adjudication? | Yes — unconditionally. No gate exists. |
| Are intention hash, artifact hash, evidence source, and detector version traceable? | Intention hash yes; artifact hash, detector version, evidence source, schema version — all absent (see §9). |
| Are there undocumented assumptions or inert fields? | Yes — see §11. |
| Does the implementation preserve compatibility with existing ledgers? | Forward compatibility is safe. Replay of old cycles through new validation would fail. |
| Are there Unicode, prompt-injection, path, or malformed-artifact risks? | Unicode confusables bypass detection. Empty prose fields pass vacuously. See §13. |

---

## What Must Be True Before Any Fidelity Finding Enters the Record as "Violation"

The ledger currently records `intention_violated` events immediately on text-scan detection. Per the epistemic integrity requirement, an `intention_violated` event should not be written until the following sequence completes:

1. A signal is detected (text or image layer)
2. The signal is classified as a possible violation (not a confirmed one)
3. An adversarial challenge evaluates: negation? quotation? avoidance? synonym? insufficient evidence?
4. The challenge resolves to: `confirmed_violation`, `rejected_violation`, `unresolved`, or `undetectable_at_this_layer`
5. Only a `confirmed_violation` result enters the ledger with a name that implies conviction

Until this is implemented, the ledger records allegations as convictions.

---

*This audit is committed as documentation only. It does not implement any change to production behavior. Proceed to Fidelity PR A only after this audit is reviewed and the recommended PR structure is agreed.*
