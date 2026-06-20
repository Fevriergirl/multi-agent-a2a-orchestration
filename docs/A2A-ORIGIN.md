# A2A origin and repository provenance

The repository has one continuous Git history but two project identities.

## Original proposal

Commits `ec2a793`, `5ed8d23`, and `0d24ed4` contained only `README.md`. That
README described a two-agent proof of concept in which a research agent sent AI
trend signals to an EvoMap Evolver mailbox backed by JSONL persistence. The
named implementation files were never committed, so the original working-demo
claim cannot be reproduced from this repository.

The full proposal is preserved at
[`archive/MULTI-AGENT-A2A-ORCHESTRATION.md`](archive/MULTI-AGENT-A2A-ORCHESTRATION.md).

## Haunted Studio import

Commit `3a25b8` added `haunted-studio-v0.3.0.zip`. Its SHA-256 is:

```text
d1603c730cbccc16049f0545d6d13c03b1f1b3f3ac21f5cbbc9e19e49975b69e
```

Commit `bee2640` extracted the complete 59-file archive into the repository and
removed the duplicate ZIP from the working tree. A byte-aware audit confirmed
that every archived file matches the extracted tracked file after line-ending
normalization. The ZIP remains recoverable from Git history, so no work was
lost when the duplicate binary was removed.

## Relationship between the projects

Haunted Studio does not implement the proposed research-agent/Evolver system.
It implements its own local observation mailbox and append-only ledger. External
agents may deliver `observation_signal` messages, but delivery is only an input:
the attention agent still decides whether an observation matters.

The current project should therefore be named Haunted Studio. The historical
A2A proposal remains documentation, not a second partially working codebase.
