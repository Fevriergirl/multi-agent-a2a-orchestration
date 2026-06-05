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
