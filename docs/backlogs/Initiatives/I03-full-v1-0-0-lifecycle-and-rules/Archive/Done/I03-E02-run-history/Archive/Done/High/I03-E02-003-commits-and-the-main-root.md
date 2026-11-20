# I03-E02-003 — Commits and the main root

| Field | Value |
| --- | --- |
| ID | `I03-E02-003` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | 2026-11-05 |

## Scope

Add the timeline of commits, and the main root holding exactly the state and effects sub-roots,
whose effects sub-root holds a direct and an indirect part. A state commit makes a new state
sub-root and an effect commit makes a new effects sub-root. Each commit makes a new main root,
and references the earlier commit.

### Outcome

- A run's orders and deliveries now sit under a main root, with an effects sub-root that has a
  direct and an indirect part, and `SimulationRun` keeps a timeline of commits.
- A step that changes both sub-roots throws, which stops the run. So every run checks the rule,
  and a test covers it.
- An inbox pass that reads nothing used to build a new state object, so it looked like a change. It
  now hands back the same state.
- A commit is one step for now, and only state commits are made. I03-E02-004 splits steps into
  transactions, and I03-E02-005 adds effect commits. The clock, schedule, log, and scenario names
  stay beside the main root until I03-E02-006.
- A city day makes 59,046 commits, exactly the steps that change state, with the same digest. It
  peaks at 1,037 MB and holds 511 MB at the end, at 41.9 s.

## Acceptance criteria

- A test on every run shows that a state commit never changes the effects sub-root, and an
  effect commit never changes the state sub-root.
- Two moments with the same state sub-root have identical state, by one pointer comparison.
- Every commit keeps its main root in memory.

## Dependencies

- [I03-E02-002 — Records split with version chains](I03-E02-002-records-split-with-version-chains.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-05 — Moved from Proposed to Ready: its dependency I03-E02-002 is Done.
- 2026-11-05 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-05 — Moved from In Progress to Done: a run keeps a timeline of commits over a main
  root with two sub-roots. npm run check passes, and both pinned digests hold.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
