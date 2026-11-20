# I03-E03-010 — Return path

| Field | Value |
| --- | --- |
| ID | `I03-E03-010` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

A driver requests a return from `DeliveryAttemptFailed`, and the restaurant accepts or rejects
it.

## Acceptance criteria

- A built-in scenario covers accepting and rejecting.
- An accepted return ends the order as `OrderReturned`.

## Dependencies

- [I03-E03-007 — Failed delivery path](I03-E03-007-failed-delivery-path.md)

## Sources and evidence

- [V1.0.0 lifecycle](../../../../../design/versions/V1.0.0/lifecycle.md)
- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
