# I02-E03-003 — Outboxes and inboxes, both ways

| Field | Value |
| --- | --- |
| ID | `I02-E03-003` |
| Parent | [I02-E03 — V1.0.0 happy path](../../../I02-E03-v1-0-0-happy-path-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The communication between the two modules on this path: both outboxes, both inbox jobs, the
delivery request handoff, and the driver commands that call orders directly.

### Outcome

- One order now goes from creation to delivered through both modules, driven by their jobs on the
  simulated clock, and repeats exactly from the same seed. The commands are direct calls in the
  tests until I02-E03-004 scripts the actors.
- Each event that takes effect writes one outbox event in its module, within the same step. A
  delivery request writes its own when deliveries acknowledges it.
- Each inbox job applies the other's events once. Once events stop, the modules agree on the
  status, version, driver, and events.
- The log traces each action across the modules, one exact cause at a time.
- 45 faults planted in the code were tried, one at a time. Two were missed, and showed that causes
  skipped the inbox read. The code and tests were fixed, and 8 faults on causes were all caught.
- Off this path, and so not built: inbox retries and dead letters, pending driver commands,
  cleanups, and refused events. See FND-67.

## Acceptance criteria

- Each event that takes effect writes one outbox event in its module, in the same simulated
  transaction.
- Each module's inbox job applies the other's events, and the two modules agree once events
  stop.

## Dependencies

- [I02-E03-001 — Orders module path](I02-E03-001-orders-module-path.md)
- [I02-E03-002 — Deliveries module path](I02-E03-002-deliveries-module-path.md)

## Sources and evidence

- [Project foundation: FND-24](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-24--goal-is-correctness)
- [Project foundation: FND-30](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-30--technical-correctness)
- [Project foundation: FND-46](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail)
- [V1.0.0 module communication](../../../../../../../../../../../design/versions/V1.0.0/module-communication.md)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependencies, I02-E03-001 and I02-E03-002, are
  Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: every acceptance criterion
  is met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
