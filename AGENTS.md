# Agent instructions

## Purpose

This repository tests whether a persistent artificial creative system can develop an artistic trajectory rather than produce disconnected attractive outputs.

## Non-negotiable rules

1. Never claim the system is conscious, suffering, inspired, or emotionally alive.
2. Preserve the append-only ledger. Corrections are new events. Old events are not edited.
3. Lock intention before generating candidates.
4. Keep artist, critics, curator, and memory consolidation as separable roles.
5. The artist cannot be the sole judge of its work.
6. Rejection is a valid result. Do not force every cycle to produce a canonical work.
7. Every accepted work must have a provenance manifest.
8. Tests must run without an API key through the deterministic provider.
9. Avoid silently changing scoring thresholds or constitution rules.
10. Prefer standard Node.js modules. Add dependencies only when the value is clear.

## Definition of done for a change

- `npm test` passes.
- `npm run verify` passes after at least one cycle.
- New behavior is represented in the ledger.
- The README or experiment protocol is updated when behavior changes.
