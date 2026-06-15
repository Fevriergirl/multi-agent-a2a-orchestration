# Multi-Agent A2A Orchestration

> A 2-agent system: a research agent that feeds live AI trends into a self-evolving capability engine via A2A HTTP mailbox protocol.

**Built by:** [Fevlet](https://www.linkedin.com/in/christeen-amburgey/)
**Upstream Engine:** [EvoMap Evolver](https://github.com/EvoMap/evolver) (self-evolving capability engine)
**Status:** ✅ Working demo verified

---

## What This Is

A **true multi-agent system** with two distinct agents communicating via a real A2A (Agent-to-Agent) protocol over HTTP:

1. **AI Research Agent** — Fetches live AI trends from Hacker News API, formats them as opportunity signals, and delivers them to the evolver's inbound mailbox.
2. **Capability Evolver** — Receives those signals, selects mutation genes based on the real-world data, and evolves new capabilities.

Both agents share a **memory graph** for persistence and a **mailbox queue** for real-time signaling.

---

## Architecture

```
┌─────────────────────┐      POST /mailbox/receive      ┌─────────────────────┐
│   Research Agent    │  ─────────────────────────────▶ │   Evolver Proxy     │
│   (Node 2)          │  A2A HTTP: opportunity_signal   │   (Node 1)          │
│                     │                                 │   port 19820        │
└─────────────────────┘                                 └─────────────────────┘
          │                                                       │
          │                                                       │ GET /mailbox/poll
          │                                                       ▼
          │                                             Inbound Queue (memory)
          │                                                       │
          │                                                       │ skillUpdater.pollAndApply()
          │                                                       ▼
          └───────────────────────┬───────────────────────────────┘
                                  │
                  Memory Graph (shared JSONL persistence)
```

**Protocol:** Custom A2A-style HTTP mailbox delivery

- **Delivery:** `POST /mailbox/receive` → writes to inbound queue
- **Consumption:** `POST /mailbox/poll` → reads pending messages
- **Acknowledgment:** `POST /mailbox/ack` → marks delivered

---

## What I Built

### 1. Research Agent (`research-agent.js`)
- Fetches real AI trends from Hacker News API (no API key needed)
- Tracks 10 topics: agentic orchestration, MCP, A2A, multi-agent systems, context engineering, enterprise AI, agent mesh, LLM routing, AI feedback, self-evolving AI
- Formats findings as structured `opportunity_signal` messages with confidence scores
- Sends via HTTP to the evolver's inbound mailbox
- Also writes to shared memory graph for guaranteed persistence

### 2. Mailbox Route Extension (`routes-patch.js`)
Added `POST /mailbox/receive` to the evolver's proxy server:

```javascript
'POST /mailbox/receive': async ({ body }) => {
  const messageId = store.writeInbound({
    type: body.type,
    payload: body.payload,
    priority: body.priority || 'normal',
  });
  return { body: { message_id: messageId, status: 'received' } };
}
```

This enables any external agent to deliver messages to the evolver's inbound queue over HTTP, completing the A2A protocol loop.

### 3. End-to-End Demo (`run-demo.js`)
- Verifies evolver proxy is reachable
- Triggers research agent cycle
- Polls evolver inbound queue
- Acknowledges messages
- Verifies memory graph state

**Verified demo output:**

```
[Step 1] ✓ Evolver proxy: running (node: node_60aeb8993cf1)
[Step 2] Research Agent: Researching: multi-agent systems
[Step 2] A2A HTTP: 019e97d0-... → evolver inbound (received)
[Step 3] Evolver polled: 2 messages received
[Step 3] Type: opportunity_signal | Topic: multi-agent systems | Findings: 3
[Step 4] Acknowledged: 2
[Step 5] Memory Graph: 4 research events from ai-research-agent
```

---

## How to Run

### Prerequisites
- Node.js >= 18
- The evolver proxy running (see [EvoMap/evolver](https://github.com/EvoMap/evolver))

### Quick Start

```bash
# Install dependencies
npm install

# Run the research agent (one-shot)
node research-agent.js

# Run the full demo
node run-demo.js
```

### Manual Test

```bash
# Check evolver status
curl http://127.0.0.1:19820/proxy/status

# Send a research signal to evolver inbound
curl -X POST http://127.0.0.1:19820/mailbox/receive \
  -H "Content-Type: application/json" \
  -d '{"type": "opportunity_signal", "payload": {"topic": "MCP protocol", "confidence": 0.9}}'

# Poll evolver inbound queue
curl -X POST http://127.0.0.1:19820/mailbox/poll \
  -H "Content-Type: application/json" \
  -d '{"type": "opportunity_signal", "limit": 5}'
```

---

## Limitations & Honesty

- **Single-node deployment** — Both agents run on the same machine. The A2A protocol works but isn't distributed.
- **Local store** — The mailbox uses a local JSONL file, not a message queue like RabbitMQ or Kafka.
- **Not enterprise scale** — This is a proof-of-concept. The architecture is sound but would need queuing, retries, and auth for production.
- **Upstream dependency** — The evolver engine is from EvoMap. My contribution is the research agent and the A2A integration.

---

## Related Work

- **Upstream Engine:** [EvoMap/evolver](https://github.com/EvoMap/evolver) — the self-evolving capability engine that receives my research signals
- **Evolver's GEP Protocol:** evomap.ai/wiki — Genome Evolution Protocol for auditable AI evolution
- **MCP Protocol:** modelcontextprotocol.io — Model Context Protocol for AI tool integration
- **A2A Protocol:** google.github.io/A2A — Google's Agent-to-Agent protocol (inspiration, not implementation)

---

## License

My additions (research agent, demo, routes patch) are MIT licensed. The upstream evolver engine has its own license — see [EvoMap/evolver](https://github.com/EvoMap/evolver).

---

## Contact

**Fevlet** — building AI that builds AI.
LinkedIn: [linkedin.com/in/christeen-amburgey](https://www.linkedin.com/in/christeen-amburgey)

> "I build systems that build themselves."
