# I03-E02-017 — Measure a city day with commits

| Field | Value |
| --- | --- |
| ID | `I03-E02-017` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-07 |
| Completed | 2026-11-07 |

## Scope

Measure the memory and time of a full city day with real commits, and compare them with the
estimates in the design, ready for `I07` to revisit keeping every root in memory.

## Acceptance criteria

- Memory and run time are recorded for a full city day, on the same machine as earlier
  measurements.
- The design page states the numbers, and any large difference from the estimates is raised with
  the user.

## Dependencies

- [I03-E02-006 — Simulator data worked out](I03-E02-006-simulator-data-worked-out.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-06 — Moved from Proposed to Ready: its dependency I03-E02-006 is Done.
- 2026-11-07 — Done: the city benchmark now reports what the heap holds after full garbage
  collections, before the run, with every root, and with the latest root only, and its commits.
  The full city day, on the same PC as earlier measurements, made 254,524 commits in 51.9 s, with
  a peak of 976 MB, and held 761 MB with every root and 119 MB with the latest root, against
  FND-81's estimate of about 1,046 MB and 108 MB. The Simulation engine's performance section
  states the numbers, and the difference, lower than estimated, was raised with the user. The
  item moved to the Done archive.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
