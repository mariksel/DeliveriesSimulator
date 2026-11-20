# I02-E02-001 — Virtual clock and scheduler

| Field | Value |
| --- | --- |
| ID | `I02-E02-001` |
| Parent | [I02-E02 — Simulation core](../../../I02-E02-simulation-core-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

Clock control: virtual time that can be paused, sped up, slowed down, or stepped, with a mode
that runs at wall-clock speed, and the scheduler that drives the other modules.

### Outcome

- The scheduler and the clock exist, with no user interface yet; the controls come in I02-E05-001.
  Nothing calls `tick` until then.
- One schedule ran in the same order at `max`, `1000x`, `60x`, `1x`, and `0.5x`, by stepping, and
  when pausing, stepping, and changing speed along the way.
- Pausing stops simulated time, and stepping runs exactly one piece of scheduled work.
- 17 faults planted in the code, one at a time, were each caught by the tests.
- Decisions:
  [FND-64](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-64--clock-speed).

## Acceptance criteria

- Scheduled work runs in simulated-time order in every mode.
- Pausing stops simulated time, and stepping advances it by one scheduled event.

## Dependencies

- [I02-E01-002 — Layers, composition root, and architecture checks](../../../../I02-E01-project-foundation/Archive/Done/High/I02-E01-002-layers-composition-root-and-architecture-checks.md)

## Sources and evidence

- [Project foundation: FND-48](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)
- [Implementation roadmap](../../../../../../../../../../../design/roadmap/implementation-roadmap.md)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-03 — Moved from Proposed to Ready: its dependency, I02-E01-002, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: every acceptance criterion
  is met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
