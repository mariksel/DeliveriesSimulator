# I02-E03-002 — Deliveries module path

| Field | Value |
| --- | --- |
| ID | `I02-E03-002` |
| Parent | [I02-E03 — V1.0.0 happy path](../../../I02-E03-v1-0-0-happy-path-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The deliveries side of the path: it receives the request, dispatches it to a driver, and
records acceptance, pickup, and delivery. The driver's eligibility and the notification follow
`V1.0.0`'s rules for this path.

### Outcome

- A driver that `V1.0.0` makes eligible is notified, accepts, picks up, and delivers, and the
  delivery's events match the events page. The tests use a stand-in for orders, because the two
  modules are connected in I02-E03-003. The order-ready event also arrives then, through the inbox.
- All five eligibility rules, the ranking, the delays, and the notification sequence are built.
- Off this path, and so not built yet: rejecting, ignoring, and a new request generation.
- A finding for the real service: equal scores are ordered undefined. See FND-68.
- 39 faults planted in the code, one at a time, were each caught by the tests.
- Decisions:
  [FND-67](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-67--scope-of-the-skeleton)
  and
  [FND-68](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-68--equal-scores-and-open-request-order).

## Acceptance criteria

- A driver that `V1.0.0` makes eligible is notified, accepts, picks up, and delivers.
- The delivery's events match the events page at each step.

## Dependencies

- [I02-E02-003 — Event log](../../../../I02-E02-simulation-core/Archive/Done/High/I02-E02-003-event-log.md)

## Sources and evidence

- [Project foundation: FND-56](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries)
- [Project foundation: FND-60](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-60--implementation-stages)
- [V1.0.0 business rules](../../../../../../../../../../../design/versions/V1.0.0/business-rules.md)
- [V1.0.0 events](../../../../../../../../../../../design/versions/V1.0.0/events.md)
- [V1.0.0 actors and commands](../../../../../../../../../../../design/versions/V1.0.0/actors-and-commands.md)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E02-003, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: every acceptance criterion
  is met against a stand-in for orders, as the outcome records. Archived under
  `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
