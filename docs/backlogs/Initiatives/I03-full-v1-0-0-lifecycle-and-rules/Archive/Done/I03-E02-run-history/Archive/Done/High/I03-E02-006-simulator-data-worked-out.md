# I03-E02-006 — Simulator data worked out

| Field | Value |
| --- | --- |
| ID | `I03-E02-006` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-06 |
| Completed | 2026-11-06 |

## Scope

Remove simulator data from the root. The clock, job due times, remaining script, scenario names,
and log are worked out from commits, the scenario, and the two sub-roots. Values tuned during a
run become effect commits. The inbox scan shortcut moves only inside a state commit.

Random stream positions and tuned values move to the effects sub-root, and rule functions receive
values as an argument. Commits become the single record of a run, and the Event log is worked out
from them with the same contents.

## Acceptance criteria

- The main root holds exactly the two sub-roots.
- The worked-out order of work due at one moment matches today's, shown by the pinned digest, or
  any change to it is explained.
- A cache beside the timeline serves log lookups, can be rebuilt, and isn't saved.

## Dependencies

- [I03-E02-005 — Direct effect commits and their groups](I03-E02-005-direct-effect-commits-and-their-groups.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-05 — Moved from Proposed to Ready: its dependency I03-E02-005 is Done.
- 2026-11-05 — Moved from Ready to In Progress: the user asked to complete it. The user settled
  the open details in FND-81: the lookups sit in the cache, the service holds the clock past the
  latest commit, a config change is a direct kind, starting values sit in the start root, and
  random stream positions sit in a randomness part of the effects sub-root.
- 2026-11-06 — Moved from In Progress to Done: a run holds only its script, timeline, root, and
  cache, and the main root only its two sub-roots. The work due, the clock, the remaining script,
  the order names, and the log are worked out, and the cache is rebuilt on loading. The pinned
  digests hold, including the full city day's. npm run check passes.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
