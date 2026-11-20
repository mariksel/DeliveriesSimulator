# I02-E02-002 — Seeded randomness and determinism check

| Field | Value |
| --- | --- |
| ID | `I02-E02-002` |
| Parent | [I02-E02 — Simulation core](../../../I02-E02-simulation-core-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

All randomness comes from the run's seed, and the Determinism check compares two runs of the
same version, scenario, and seed.

### Outcome

- Two runs of a small sample, with the same seed, match event for event, also across speeds. Real
  versions and scenarios do not exist yet, so the first criterion on a real scenario moved to
  I02-E04-004 on 2026-11-04, by the user's decision.
- The check reports the first difference, with both runs' entries, when a run is made to differ.
- The random numbers match a separate implementation, and the tests pin them.
- 13 faults planted in the code, one at a time, were each caught. One needed a test added first.
- Decisions:
  [FND-66](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-66--seeded-randomness).

## Acceptance criteria

- Two runs with the same seed match event for event, on a sample run.
- The check reports the first difference when a run is made to differ.

## Dependencies

- [I02-E02-001 — Virtual clock and scheduler](I02-E02-001-virtual-clock-and-scheduler.md)

## Sources and evidence

- [Project foundation: FND-48](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)
- [Implementation roadmap](../../../../../../../../../../../design/roadmap/implementation-roadmap.md)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E02-001, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: its criteria are met, and
  the part that needs a real scenario moved to I02-E04-004. Archived under `Archive/Done/High/`;
  its epic is archived with it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
