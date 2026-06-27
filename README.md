# Haunted Studio

> An auditable multi-agent experiment asking whether an artificial creative system can develop an artistic trajectory, not merely generate isolated attractive objects.

This repository began as a two-agent A2A orchestration concept. Haunted Studio turns that foundation toward a harder question:

> Can a system become answerable to what it has already made?

## Current status: v0.3.0

The repository now contains a runnable Node.js system, not only a design document.

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

## Make art offline (no API key)

The studio renders its own images with a built-in, dependency-free renderer —
no external API, no key, no network. One command:

```bash
npm run art        # one cycle that renders and audits a real image
```

This runs a full creative cycle and, for the accepted concept, writes a real
`artifact.png` next to the cycle's other files
(`.haunted-studio/works/cycle_.../artifact.png`), then audits the image it
actually produced. A passing audit promotes the work to `verified_artifact`.

The renderer is a deterministic, generative interpretation in the studio's
visual language — an ordinary tonal field, one understated impossibility, a
pale form, and an area of visual silence. Each of the studio's five strategies
renders as a **distinct composition** (peripheral evidence, ritual under
pressure, afterimage, material contradiction, false hospitality), chosen from
the concept itself. It is not photoreal; for that, flip the image backend
(below). The same `--image` flag works under any provider:

```bash
node src/cli.js run --image                              # deterministic, offline
HAUNTED_STUDIO_PROVIDER=anthropic ANTHROPIC_API_KEY=... node src/cli.js run --image  # Claude reasons, renderer draws
```

### Choosing the image backend

Rendering is chosen independently of the reasoning provider, so any provider
can draw with the offline renderer or a live photoreal API — flipped by one
env var:

```bash
# default: built-in offline renderer, no key
HAUNTED_STUDIO_IMAGE=offline

# photoreal: OpenAI Images API (needs a paid key + a valid image model)
export HAUNTED_STUDIO_IMAGE=openai
export OPENAI_API_KEY=sk-...your-key...
export OPENAI_IMAGE_MODEL=<a-currently-valid-image-model>
node src/cli.js run --image          # e.g. with deterministic or Claude reasoning
```

In both cases the visual audit reads the pixels that were actually produced, so
a photoreal render is judged on the image, not the prompt.

## A2A proof of life (start here)

New to the project? Run one command to watch a complete agent-to-agent flow,
end to end, with no API key and no setup beyond Node.js:

```bash
npm run proof:a2a
```

This does the whole thing for you, in order, and prints each stage:

1. starts the local A2A mailbox server;
2. posts one external observer message into the mailbox over HTTP;
3. polls and consumes that message;
4. feeds the consumed observation into the real orchestration cycle;
5. shows which internal agent roles were invoked (attention, artist, critic
   panel, curator, audience, memory);
6. saves a readable result to `outputs/a2a-proof-of-life.md`;
7. saves the raw hash-linked event trace to `outputs/a2a-proof-of-life.jsonl`.

Open `outputs/a2a-proof-of-life.md` afterward. The observer message text you
sent is the same text the cycle builds its artifact from — that is the proof
the external message reached the internal agents.

To confirm it with a test:

```bash
npm test
```

The `A2A proof` test posts a message, runs the cycle, and asserts the message
was consumed and appears in the saved artifact.

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

## Live provider setup

By default the studio runs fully offline with the **deterministic** provider, so
no key is needed for `npm test`, `npm run demo`, or `npm run proof:a2a`. The
deterministic provider validates the machinery; it does not use a real model.

Two live providers are available: **`anthropic`** (Claude, text only) and
**`openai`** (text plus image generation). Set the variables **outside the
repository** (never commit a key).

### Option A — Anthropic / Claude (text)

Claude drives every reasoning agent (attention, necessity, artist, critics,
curator, audience, memory). Claude has no image-generation API, so the image
and visual-audit stages are skipped and accepted work stays at
`conceptual_only` status — concepts and briefs, no rendered image.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `HAUNTED_STUDIO_PROVIDER` | yes (`anthropic`) | `deterministic` | Selects the Claude provider |
| `ANTHROPIC_API_KEY` | yes | _none_ | The run fails immediately without it |
| `ANTHROPIC_MODEL` | recommended | `claude-sonnet-4-6` | Any current Claude model id |
| `ANTHROPIC_BASE_URL` | no | `https://api.anthropic.com/v1` | For compatible endpoints |
| `ANTHROPIC_MAX_TOKENS` | no | `4096` | Per-response output cap |

```bash
export HAUNTED_STUDIO_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-...your-key...
# Optional: pick a more capable model (e.g. a current Opus model)
export ANTHROPIC_MODEL=claude-sonnet-4-6
node src/cli.js run
```

The default model is a Sonnet-class model for balanced cost and capability;
set `ANTHROPIC_MODEL` to a current Opus model id for maximum capability.

### Option B — OpenAI (text + image)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `HAUNTED_STUDIO_PROVIDER` | yes (`openai`) | `deterministic` | Selects the OpenAI provider |
| `OPENAI_API_KEY` | yes | _none_ | The run fails immediately without it |
| `OPENAI_TEXT_MODEL` | recommended | `gpt-5.5` | Reasoning + visual audit model |
| `OPENAI_IMAGE_MODEL` | recommended | `gpt-image-2` | Image generation model |
| `OPENAI_BASE_URL` | no | `https://api.openai.com/v1` | For compatible endpoints |

> The default model names are placeholders. Override `OPENAI_TEXT_MODEL` and
> `OPENAI_IMAGE_MODEL` with model IDs that actually exist on your account, or a
> live run may fail with a model-not-found error. A ChatGPT subscription does
> not include API access; API billing is separate.

### Set the key

```bash
export OPENAI_API_KEY=sk-...your-key...
export HAUNTED_STUDIO_PROVIDER=openai
export OPENAI_TEXT_MODEL=<a-currently-valid-text-model>
export OPENAI_IMAGE_MODEL=<a-currently-valid-image-model>
```

A local `.env` file is git-ignored. If you keep your key there, load it first:

```bash
export $(grep -v '^#' .env | xargs)
```

### Smallest harmless live test (one text call, no image)

The safest first probe is a single text request. The same probe works for
either provider — `createProvider()` reads your environment.

Claude:

```bash
HAUNTED_STUDIO_PROVIDER=anthropic \
ANTHROPIC_API_KEY=sk-ant-...your-key... \
node --input-type=module -e '
import { createProvider } from "./src/providers/index.js";
const p = createProvider();
const r = await p.selectObservation({
  observations: [{ id: "obs-1", text: "A door painted to look like open sky.", tags: ["threshold"] }],
  state: { cycle_count: 0, motifs: {} },
  constitution: {}
});
console.log(JSON.stringify(r, null, 2));'
```

OpenAI (image generation is the expensive part, so this stays text-only too):

```bash
HAUNTED_STUDIO_PROVIDER=openai \
OPENAI_API_KEY=sk-...your-key... \
OPENAI_TEXT_MODEL=<a-currently-valid-text-model> \
node --input-type=module -e '
import { createProvider } from "./src/providers/index.js";
const p = createProvider();
const r = await p.selectObservation({
  observations: [{ id: "obs-1", text: "A door painted to look like open sky.", tags: ["threshold"] }],
  state: { cycle_count: 0, motifs: {} },
  constitution: {}
});
console.log(JSON.stringify(r, null, 2));'
```

If it prints JSON containing `observation` and `score`, the live text path
works. Next, run a full text-only cycle (still no image cost):

```bash
node src/cli.js run        # ~8 text calls, no image
```

For OpenAI only, add `--image` once the text path is confirmed:

```bash
node src/cli.js run --image   # also calls the image model + visual audit
```

### Status of the live path

Both adapters are fully implemented. The Anthropic adapter drives every
reasoning agent through the Claude Messages API (`/messages`); it has no image
generation, so image runs are skipped cleanly. The OpenAI adapter adds text
reasoning (`/responses`), image generation (`/images/generations`), and a
multimodal visual audit. Both have only ever been exercised against **mocked**
HTTP in the test suite; no live API call has been made from this repository.
Treat the first live run as unverified and start with the single-call probe
above.

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
docs/            research protocol, architecture, mobile setup
observations/    seed observation stream
scripts/         reproducible demo
src/a2a/         local mailbox
src/agents/      attention, artist, critics, curator, memory
src/core/        ledger, state, hashing, scoring, validation
src/engine/      cycle, reviews, reports, forks, diagnostics
src/experiment/  conditions and ablation runner
src/providers/   deterministic, Anthropic, and OpenAI adapters
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
