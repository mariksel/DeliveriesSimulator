# I02-E07-003 — Snapshots and performance benchmark

| Field | Value |
| --- | --- |
| ID | `I02-E07-003` |
| Parent | [I02-E07 — Style and immutable rework](../../../I02-E07-style-and-immutable-rework-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-04 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

Proves the design: tests that a snapshot stays unchanged as a run goes on, and an on-demand
benchmark of a city-scale run, which also decides whether any performance exception is
justified.

### Outcome

- Tests take a snapshot, run on, and show it is unchanged, at every step of a run. A deep-frozen
  snapshot runs on to the same end as a run that never stopped, and can branch without affecting
  the other branch or itself.
- `npm run benchmark` runs a city: 500 drivers and 5,000 orders in a simulated day. It took 38.1 s,
  delivered every order, and peaked at 641 MB. The mutable design was stopped after 500 s at that
  size. The full results are on the
  [Simulation engine](../../../../../../../../../../../design/modules/simulation-engine.md#performance)
  page.
- The first immutable version was slower than the mutable one, because of full scans that both
  designs had. Indexes in the state fixed that, and left the digests the same.
- One exception was proven: `runDigest`, whose loop took 0.15 s where the version without local
  variables took 8.5 s and 1.6 GB. It has its comment and its benchmark.
- `npm run check` passes. Stryker, run once as the last check on the whole rework, scores 95.37%.
  Its 40 uncaught mutants were read: they are message wording, or change only speed, or have no
  effect on behaviour. Tests that pin each inbox's position were added after it, and it was not run
  again.

## Acceptance criteria

- A test takes a snapshot, runs on, and shows the snapshot is unchanged.
- `npm run` has a benchmark of a city-scale run, whose result is recorded.
- Any mutable exception has its benchmark and a comment.

## Dependencies

- [I02-E07-002 — Immutable run state](I02-E07-002-immutable-run-state.md)

## Sources and evidence

- [Project foundation: FND-73](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-73--immutable-architecture)
- [Project foundation: FND-48](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)

## Status history

- 2026-11-04 — Created as Proposed, on the user's decision. It starts when its dependencies are
  Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E07-002, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started the item.
- 2026-11-04 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-04 — Created at High priority, like the rest of I02.
