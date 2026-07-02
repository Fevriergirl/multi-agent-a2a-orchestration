# Repository identity and provenance audit

Date: 2026-06-19

Audit branch: `cleanup/haunted-studio-identity`

Audited base: `bee264070dea6647a8284a1e46aa6d7e30baa963`

## Conclusion

The repository acquired two incompatible names, not two coexisting
implementations. Its GitHub and npm identity remained
`multi-agent-a2a-orchestration`, while all runnable source, configuration,
tests, and current documentation implement Haunted Studio. A2A is an auxiliary
observation mailbox in Haunted Studio rather than the system's primary purpose.

The coherent disposition is:

1. treat Haunted Studio as the current standalone project;
2. preserve the earlier A2A proposal as explicitly historical documentation;
3. avoid inventing or claiming recovery of source that was never committed;
4. retain the complete Git history and imported archive provenance; and
5. distinguish executable mechanics from unproven research hypotheses.

## Inspected state

- 59 tracked files across source, tests, configuration, documentation, and
  repository automation;
- five commits, one remote branch (`origin/main`), and no tags;
- a clean working tree before cleanup;
- package metadata, lockfile, README, all documentation, tests, workflow,
  configuration, source layout, and complete reachable Git history;
- Git object integrity using `git fsck`; and
- npm publication contents using `npm pack --dry-run`.

## History

The first three commits contained only a README describing a research agent,
an EvoMap Evolver integration, and a demonstration. The named JavaScript files
were absent, so those claims are not reproducible from this repository.

Commit `3a25b8` then added `haunted-studio-v0.3.0.zip`; commit `bee2640`
extracted it and removed the duplicate binary. The supplied checksum was
verified, and the archive was compared against the working tree:

- SHA-256: `d1603c730cbccc16049f0545d6d13c03b1f1b3f3ac21f5cbbc9e19e49975b69e`;
- 59 files in the archive;
- 59 normalized content matches;
- no missing, extra, or divergent files.

The ZIP remains preserved as Git blob `3ab70e9393bbea8630497ecc32d792d075fb31a3`.
Recommitting it would add duplication without preserving additional work.

## Problems found

- npm metadata used the obsolete repository name and allowed accidental
  publication under that identity;
- the experiment protocol documented four conditions while the runner executes
  six;
- the prior audit described a pre-push state as if it were current;
- the changelog implied a `0.2.0` release unsupported by a tag or runnable
  historical commit;
- mobile setup instructions described the one-time ZIP upload rather than the
  current repository;
- generated `experiments/` output was not ignored;
- the public reset command could delete the append-only ledger without first
  preserving it; and
- the original A2A proposal was summarized too briefly to preserve its design
  context clearly.

## Research boundary

The implementation demonstrates software mechanisms: role separation,
intention ordering, append-only event hashing, state reconstruction, refusal and
revision paths, experiment execution, and deterministic testing. It has not
demonstrated artistic development, consciousness, subjective experience,
personhood, or authorship. Deterministic output validates machinery only.

## Preservation decisions

- The append-only ledger format, constitution, experiments, tests, provenance
  manifests, and research hypotheses remain in place.
- The historical A2A proposal is retained under `docs/archive/` and tied to its
  source commit.
- Generated studio and experiment data remain outside version control.
- Resetting a user studio archives the directory before a new studio is begun.
- The GitHub repository rename is deferred until after review because it is an
  external operation rather than a change that can be represented in this PR.

## Cleanup validation

- `npm test`: 12 tests passed, including two archive-before-reset tests;
- syntax checks passed for every JavaScript file under `src/`, `scripts/`, and
  `test/`;
- the five-cycle deterministic demo completed with a valid ledger;
- an isolated persistent cycle, diagnostics, and ledger verification passed;
- a one-cycle-per-condition six-condition experiment smoke test completed; and
- the public reset command archived the isolated studio, after which the
  archived 10-event ledger still verified with the same head hash.

No lint dependency or lint configuration exists. A new dependency was not added
solely for this cleanup; JavaScript syntax validation is the available static
check.
