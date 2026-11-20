# I02-E03-001 — Orders module path

| Field | Value |
| --- | --- |
| ID | `I02-E03-001` |
| Parent | [I02-E03 — V1.0.0 happy path](../../../I02-E03-v1-0-0-happy-path-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The orders side of the path: the restaurant creates the order and requests delivery, and orders
records each event and status of the lifecycle.

### Outcome

- The order goes from `Created` to `Delivered` through the lifecycle page's statuses, from
  version 1 to version 7, and the tests check each step.
- The lifecycle page did not define the version, so it now does, from the real service's code.
- Orders reports through an abstraction, because the confirmed graph gives it no dependency on the
  event log. The simulation engine implements it from I02-E03-003 on.
- Refusing a second delivery request while one is pending follows from reading the real service's
  order history, not from a stated rule. It is off this path, so I03 should confirm it.
- 24 faults planted in the code, one at a time, were each caught by the tests.
- Decisions:
  [FND-67](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-67--scope-of-the-skeleton).

## Acceptance criteria

- The order reaches `V1.0.0`'s delivered status through the states that its lifecycle page
  lists.
- The order's events and version match the lifecycle page at each step.

## Dependencies

- [I02-E02-003 — Event log](../../../../I02-E02-simulation-core/Archive/Done/High/I02-E02-003-event-log.md)

## Sources and evidence

- [Project foundation: FND-38](../../../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-38--order-detail)
- [Project foundation: FND-60](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-60--implementation-stages)
- [V1.0.0 lifecycle](../../../../../../../../../../../design/versions/V1.0.0/lifecycle.md)
- [V1.0.0 events](../../../../../../../../../../../design/versions/V1.0.0/events.md)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E02-003, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: every acceptance criterion
  is met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
