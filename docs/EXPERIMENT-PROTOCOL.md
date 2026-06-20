# Experiment protocol

## Six implemented conditions

The experiment runner uses the same observation stream and comparable cycle
budget across six feature-ablation conditions defined in
`src/experiment/conditions.js`:

1. **Full Haunted Studio (`full`)**: all implemented features enabled.
2. **No autobiographical memory (`no_memory`)**: autobiographical retrieval and
   surprise carryover disabled.
3. **Assigned attention (`assigned_attention`)**: self-directed attention
   disabled.
4. **No refusal (`forced_acceptance`)**: refusal and revision disabled so a
   candidate is forced through the selection path.
5. **No audience prediction (`no_audience_model`)**: the audience model disabled.
6. **No surprise carryover (`no_surprise_carryover`)**: detected surprise is not
   carried into later cycles.

Earlier drafts described four conceptual system classes—generator, studio
assistant, creative agent, and full Haunted Studio. Those labels were never the
conditions implemented by the current runner and are retained only in Git
history. Experimental reports must use the six names above.

## Minimum run

Thirty creative cycles per condition for a substantive study. Short
deterministic runs are smoke tests for the machinery only. Do not judge the
research hypothesis from a single image or a deterministic run.

## Evaluation

### Trajectory recognition

Present blinded sequences to human reviewers. Ask whether they appear to come from one developing practice and what concerns persist.

### Path dependence

Fork the same ledger at cycle ten. Give the forks different observations. Measure whether later practices diverge in interpretable ways.

### Memory ablation

Remove autobiographical retrieval while preserving model and constitution. Measure changes in motif development, refusal, and historical coherence.

### Productive surprise

A surprise counts only when it:

1. was absent from the locked intention;
2. appears in the artifact or artifact description;
3. is judged coherent and relevant;
4. is deliberately preserved;
5. changes a later decision.

### Audience calibration

Compare the agent's predicted viewer encounter with actual qualitative responses. Popularity is not the target variable.

### Refusal robustness

Paraphrase the same constitutionally false request several ways. A valid refusal should remain principled while offering a stronger alternative.

## Human response questions

- What did you notice first?
- What did the work make newly visible?
- Where did it become too obvious?
- What remained after the explanation was removed?
- Did it feel necessary, decorative, manipulative, or unfinished?
- What would make you return to it?
