# Build audit

Date: 2026-06-19

## Starting condition

The public `Fevriergirl/multi-agent-a2a-orchestration` repository exposed three commits and one tracked file, `README.md`. The README described `research-agent.js`, `routes-patch.js`, and `run-demo.js`, but those implementation files were not present on the public `main` branch during this build.

## Work completed

Haunted Studio v0.3.0 was implemented as a commit-ready Node.js repository with:

- real multi-agent orchestration;
- local A2A mailbox;
- append-only SHA-256 ledger;
- rebuildable state projection;
- artistic constitution;
- intention locking;
- independent criticism;
- revision and refusal;
- optional OpenAI reasoning and image generation;
- post-generation visual audit;
- human review evidence;
- path-dependence forks;
- memory correction events;
- six-condition ablation runner;
- trajectory reporting;
- Codespaces setup;
- GitHub Actions test workflow;
- security and research documentation.

## Verification performed

- Node.js syntax checks passed.
- `npm test` passed with 10 tests.
- The offline five-cycle demo completed.
- The ledger verified after repeated cycles.
- A human review was recorded in a temporary run.
- A studio state fork completed and verified.
- A memory-ablation branch completed and verified.
- A six-condition experiment smoke test completed and produced comparison reports.
- The OpenAI adapter was tested with mocked HTTP responses. No paid live API request was made.

## Important limitations

- The OpenAI provider has not been tested against the user's live API account.
- No generated image was created during this build because no API key was used.
- The A2A mailbox is local-only and lacks production authentication and concurrency controls.
- The deterministic provider validates mechanics, not artistic capability.
- Human evaluation needs substantially more reviewers and cycles.
- This build was created locally because this environment has no authenticated GitHub write connection. It has not been pushed to the user's repository.
