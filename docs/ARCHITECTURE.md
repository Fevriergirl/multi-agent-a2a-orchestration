# Architecture

## Design principle

The system separates generation from judgment and separates remembered history from unverifiable autobiography.

## Components

### Studio

Owns persistent state, work directories, constitution, experiment configuration, and the append-only ledger.

### Attention agent

Ranks observations using novelty, recurrence, unresolved tension, and saturation. It selects a subject before an assigned prompt is supplied.

### Artist agent

Forms necessity, locks an intention, and generates candidate briefs. The intention is hashed before candidates exist.

### Critic panel

Scores formal coherence, truth, historical development, adversarial survival, and productive surprise. Shortcut findings apply penalties.

### Curator

May accept, request one disciplined revision, or reject everything. Rejection is not treated as system failure.

### Audience model

Predicts first notice, likely misreading, lingering effect, and subtlety risk before human responses are collected.

### Memory conservator

Updates motifs, unresolved tensions, observation counts, and preserved surprises. It does not edit the ledger.

### A2A mailbox

Accepts external observation signals through HTTP and persists them in JSONL until acknowledged.

## Trust boundaries

- Model output is untrusted data.
- The ledger is verified before forks and after cycles.
- Human reviews require explicit consent.
- API keys remain outside the repository.
- External observations include rights metadata.
- Generated first-person language is not treated as evidence of inner experience.

## State versus ledger

`state.json` is a current projection used for efficient retrieval. `ledger.jsonl` is the authoritative history. If they disagree, rebuild state from the ledger rather than altering the ledger to match state.
