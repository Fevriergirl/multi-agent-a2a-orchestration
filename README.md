# Haunted Studio

> An auditable multi-agent experiment asking whether an artificial creative system can develop an artistic trajectory, not merely generate isolated attractive objects.

This codebase is Haunted Studio. The GitHub repository began under the name
`multi-agent-a2a-orchestration` as a proposed two-agent A2A demonstration, but
the runnable implementation now in the repository is a separate research
system. A2A messaging remains as one input mechanism rather than the project's
identity or primary architecture.

The original proposal is preserved in
[`docs/archive/MULTI-AGENT-A2A-ORCHESTRATION.md`](docs/archive/MULTI-AGENT-A2A-ORCHESTRATION.md),
with its evidentiary limits stated explicitly. See [`docs/A2A-ORIGIN.md`](docs/A2A-ORIGIN.md)
for commit-level provenance.

Haunted Studio asks a harder question:

> Can a system become answerable to what it has already made?

## Current status: v0.3.0

The repository contains a runnable Node.js research prototype. Version 0.3.0
identifies the first complete Haunted Studio tree committed here; it is not a
claim that the research hypothesis has been demonstrated.

It includes:

- self-directed attention over an observation stream;
- creative necessity and pre-generation intention locking;
- multiple distinct candidate concepts;
- independent formal, truth, historical, adversarial, and surprise criticism;
- one disciplined revision opportunity;
- meaningful refusal when nothing deserves acceptance;
- optional image generation and post-generation visual audit;
- audience prediction followed by recorded human responses;
- motif, unresolved-tension, and surprise memory;
- append-only hash-linked history;
- state forks for path-dependence experiments;
- six-condition ablation testing;
- trajectory reports;
- a local A2A observation mailbox;
- an offline deterministic provider and an optional OpenAI provider;
- a test suite with no required third-party packages.

## Honest boundary

This project does not establish that a model is conscious, feels need, receives a muse, suffers, or possesses personhood. Model-generated first-person language is not evidence of an inner life.

The experiment tests six observable properties associated with artistic practice:

1. selective attention;
2. path dependence;
3. normative resistance;
4. transformative surprise;
5. relational intention;
6. answerability to a body of work.

## Quick start

Requires Node.js 20 or newer.

```bash
npm test
npm run demo
```

The demo runs five offline creative cycles and writes a trajectory report.

For a persistent studio:

```bash
npm run cycle
npm run status
npm run verify
npm run report
```

Run diagnostics:

```bash
npm run doctor
```

## Persistent studio

The default runtime state appears in `.haunted-studio/` and is excluded from Git:

```text
.haunted-studio/
├── ledger.jsonl
├── state.json
├── mailbox.jsonl
├── reviews/
├── reports/
└── works/
    └── cycle_.../
        ├── 01-observation.json
        ├── 02-locked-intention.json
        ├── 03-candidates.json
        ├── 04-critiques.json
        ├── 05-curation.json
        ├── 06-artifact-audit.json
        ├── 06b-audience-prediction.json
        ├── 07-memory-consolidation.json
        └── manifest.json
```

Some files appear only when their stage occurs. A rejected cycle has no artifact or audience prediction. A revised cycle includes additional revision files.

## The creative cycle

```text
OBSERVE
  ↓
SELECT WHAT MATTERS
  ↓
FORM NECESSITY
  ↓
LOCK AND HASH INTENTION
  ↓
GENERATE DISTINCT CANDIDATES
  ↓
INDEPENDENT CRITIC PANEL
  ↓
ACCEPT, REVISE ONCE, OR REFUSE ALL
  ↓
OPTIONALLY GENERATE THE ARTIFACT
  ↓
AUDIT THE IMAGE THAT ACTUALLY EXISTS
  ↓
PREDICT THE VIEWER ENCOUNTER
  ↓
RECORD HUMAN RESPONSES
  ↓
CONSOLIDATE MEMORY WITHOUT REWRITING HISTORY
  ↓
MAKE THE NEXT CYCLE ANSWER TO THIS ONE
```

A concept accepted before image generation receives `conceptual_only` status. A generated image enters `verified_artifact` status only after its visual audit meets the configured threshold. A failed image does not inherit the concept's acceptance automatically.

## Use a live model and image generator

A ChatGPT subscription does not include API usage. API billing and access are separate.

Set environment variables outside the repository:

```bash
export HAUNTED_STUDIO_PROVIDER=openai
export OPENAI_API_KEY=your_key_here
export OPENAI_TEXT_MODEL=gpt-5.5
export OPENAI_IMAGE_MODEL=gpt-image-2
node src/cli.js run --image
```

Model names are configurable because model availability changes.

Official documentation:

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/image-generation

## Run the ablation experiment

The experiment runner executes six otherwise related conditions:

- full Haunted Studio;
- no autobiographical memory;
- assigned rather than self-directed attention;
- forced acceptance with refusal removed;
- no audience prediction;
- no surprise carryover.

Run five cycles per condition:

```bash
npm run experiment -- 5 experiments/run-001
```

Outputs:

```text
experiments/run-001/
├── comparison.json
├── comparison.md
├── full/
├── no_memory/
├── assigned_attention/
├── forced_acceptance/
├── no_audience_model/
└── no_surprise_carryover/
```

A deterministic run validates the machinery. It does not validate the artistic hypothesis. That requires live model behavior, enough cycles, and blinded human review.

Experiment output is generated runtime data and is ignored by Git. Preserve a
run outside the working tree or publish a deliberately curated, consent-checked
research artifact rather than committing the raw runtime directory.

## Record a human review

Copy and edit `docs/human-review.example.json`, then run:

```bash
node src/cli.js review <cycle-id> my-review.json
npm run report
```

The system records what the viewer actually noticed and compares it with the prior audience prediction. Approval alone is not treated as useful evidence.

## Fork the artistic history

Create a branch of the studio state at a particular point:

```bash
node src/cli.js fork .haunted-studio-branch-a "branch exposed to institutional observations"
```

Run the branch by pointing `HAUNTED_STUDIO_HOME` to it:

```bash
HAUNTED_STUDIO_HOME=.haunted-studio-branch-a npm run cycle
```

This supports the central path-dependence test: start with the same history, expose branches to different experiences, and determine whether their practices meaningfully diverge.

## Correct memory without rewriting it

A mistaken interpretation is corrected by adding a new event, not editing the old event.

```bash
node src/cli.js correct-memory docs/my-correction.json
```

See `docs/memory-correction.example.json`.

If the current state projection is lost or falls behind the ledger:

```bash
node src/cli.js rebuild-state
npm run verify
```

The ledger is authoritative. `state.json` is a rebuildable working projection.

`npm run reset` does not silently delete an existing ledger. It moves the
current studio directory to a timestamped sibling archive before a new studio is
created on the next run. Disposable test and experiment directories continue to
be cleared internally by their runners.

## A2A observation mailbox

The mailbox binds to `127.0.0.1` by default and is not production hardened.

```bash
npm run serve
```

Send an observation:

```bash
curl -X POST http://127.0.0.1:19820/mailbox/receive \
  -H "Content-Type: application/json" \
  -d '{
    "type": "observation_signal",
    "sender": "field-observer",
    "priority": "high",
    "payload": {
      "text": "A waiting-room clock has twelve minute hands and no hour hand.",
      "tags": ["waiting", "institution", "time"],
      "rights": "project-authored"
    }
  }'
```

Let the next cycle consider pending mailbox observations:

```bash
node src/cli.js run --mailbox
```

Delivery does not guarantee selection. The attention agent still decides whether the observation matters.

## Why the ledger matters

Each event records:

- sequence number;
- timestamp;
- actor;
- cycle ID;
- previous event hash;
- current event hash.

Editing an earlier event breaks verification. This prevents the system from quietly replacing a failed history with a flattering autobiography.

```bash
npm run verify
```

## iPhone and Codespaces

The repository includes a GitHub Codespaces configuration. No local Node.js installation is required when using Codespaces from a mobile browser.

See `docs/MOBILE-SETUP.md`.

## Project map

```text
config/          constitution, thresholds, budgets
docs/            research protocol, architecture, history, mobile setup
observations/    seed observation stream
scripts/         reproducible demo
src/a2a/         local mailbox
src/agents/      attention, artist, critics, curator, memory
src/core/        ledger, state, hashing, scoring, validation
src/engine/      cycle, reviews, reports, forks, diagnostics
src/experiment/  conditions and ablation runner
src/providers/   deterministic and OpenAI adapters
test/            offline test suite
```

## Next research milestones

- artifact editing after a failed visual audit;
- blinded review assignment and reviewer randomization;
- automatic audience-prediction calibration scores;
- motif-graph visualization rather than count-only memory;
- stronger distinction between productive fixation and brand repetition;
- 30-cycle live-model runs under each condition;
- preregistered human evaluation criteria;
- a publishable methods and findings report.

See `docs/RESEARCH-HYPOTHESES.md` and `docs/EXPERIMENT-PROTOCOL.md`.

## License

MIT
