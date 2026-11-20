# I02-E02-003 — Event log

| Field | Value |
| --- | --- |
| ID | `I02-E02-003` |
| Parent | [I02-E02 — Simulation core](../../../I02-E02-simulation-core-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The complete, ordered, single record of a run. Stored runs come in `I05`.

### Outcome

- The log records entries in order with their simulated time. Nothing writes to it yet; the
  modules do from I02-E03.
- A whole log survives being stored as JSON and read back unchanged, and history cannot be changed.
- 16 faults planted in the code, one at a time, were each caught by the tests.
- The criterion that the technical view and the checks read the run from the log alone moved to
  I02-E04-003 and I02-E05-002 on 2026-11-04, by the user's decision, because they do not exist yet.
- Decisions:
  [FND-65](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-65--event-log-entries).

## Acceptance criteria

- Every event of a run is recorded in order, with its simulated time.

## Dependencies

- [I02-E02-001 — Virtual clock and scheduler](I02-E02-001-virtual-clock-and-scheduler.md)

## Sources and evidence

- [Project foundation: FND-56](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E02-001, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: its criterion is met, and
  the other moved to I02-E04-003 and I02-E05-002. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
