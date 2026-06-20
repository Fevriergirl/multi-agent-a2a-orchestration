# Historical proposal: Multi-Agent A2A Orchestration

> Archival status: proposal, not a recoverable implementation.

This document preserves the substance of the repository README as it stood at
commit `0d24ed48da0511778f0cae739a30bcb4966578a0` on 2026-06-14, with the original
architecture condensed and its status claims labeled. The repository at that
commit did not contain the named `research-agent.js`, `routes-patch.js`, or
`run-demo.js` files, test evidence, package metadata, or runtime records.
Consequently, historical statements such as “working demo verified” are claims
from the proposal and are not independently demonstrated by this Git history.

The text is retained so the original concept is not silently overwritten by
Haunted Studio. It is not current setup documentation.

---

# Multi-Agent A2A Orchestration

> A 2-agent system: a research agent that feeds live AI trends into a self-evolving capability engine via A2A HTTP mailbox protocol.

**Built by:** [Fevlet](https://www.linkedin.com/in/christeen-amburgey/)

**Upstream Engine:** [EvoMap Evolver](https://github.com/EvoMap/evolver) (self-evolving capability engine)

**Historical status claim:** Working demo verified

## What This Is

A proposed multi-agent system with two distinct agents communicating through an
A2A-style HTTP protocol:

1. **AI Research Agent** — Fetches live AI trends from Hacker News, formats them
   as opportunity signals, and delivers them to the evolver's inbound mailbox.
2. **Capability Evolver** — Receives those signals, selects mutation genes based
   on the data, and evolves new capabilities.

Both agents were described as sharing a memory graph for persistence and a
mailbox queue for signaling.

## Proposed architecture

```text
Research Agent
    |
    | POST /mailbox/receive (opportunity_signal)
    v
Evolver Proxy :19820
    |
    | GET /mailbox/poll
    v
Inbound Queue -> skillUpdater.pollAndApply()

Research Agent <-> shared JSONL memory graph <-> Evolver
```

The proposed custom A2A-style protocol used:

- `POST /mailbox/receive` for delivery;
- `POST /mailbox/poll` for consumption;
- `POST /mailbox/ack` for acknowledgment.

## Files described by the proposal

### `research-agent.js`

The README described an agent that would:

- fetch AI trends from the Hacker News API;
- track topics including agent orchestration, MCP, A2A, context engineering,
  agent mesh, routing, feedback, and self-evolving AI;
- create structured `opportunity_signal` messages with confidence scores;
- send them to the evolver mailbox; and
- write findings to a shared memory graph.

### `routes-patch.js`

The README proposed adding a `POST /mailbox/receive` route to an upstream
Evolver proxy:

```js
'POST /mailbox/receive': async ({ body }) => {
  const messageId = store.writeInbound({
    type: body.type,
    payload: body.payload,
    priority: body.priority || 'normal',
  });
  return { body: { message_id: messageId, status: 'received' } };
}
```

### `run-demo.js`

The README described an end-to-end demonstration that would check the Evolver
proxy, run the research cycle, poll and acknowledge messages, and inspect the
memory graph.

## Historical run instructions

These commands are archival and do not work against the files at the historical
commit because the named scripts were not committed.

```bash
npm install
node research-agent.js
node run-demo.js
```

The proposal also documented manual requests to `/proxy/status`,
`/mailbox/receive`, and `/mailbox/poll` on `127.0.0.1:19820`.

## Limitations stated by the proposal

- single-node deployment;
- local JSONL storage rather than a production queue;
- no enterprise-scale retry, authentication, or queueing guarantees;
- dependency on the separately licensed EvoMap Evolver project; and
- use of Google's A2A work as inspiration rather than protocol compliance.

## Preservation decision

No replacement implementation is being invented under the old name. The
original source is absent from this repository, while Haunted Studio is fully
present and tested. Restoring the old project would require a separately scoped
implementation effort and an explicit decision about the upstream Evolver
dependency and licensing.
