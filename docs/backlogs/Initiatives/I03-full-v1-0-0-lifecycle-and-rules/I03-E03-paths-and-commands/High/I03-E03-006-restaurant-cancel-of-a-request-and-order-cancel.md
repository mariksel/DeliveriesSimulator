# I03-E03-006 — Restaurant cancel of a request, and order cancel

| Field | Value |
| --- | --- |
| ID | `I03-E03-006` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

A restaurant's cancel of a delivery request, which deliveries decides first, with its retries
and refusal, and cancelling an order.

## Acceptance criteria

- A built-in scenario covers each outcome: cancelled, refused, and pending.
- The events and statuses match the lifecycle page.

## Dependencies

- [I03-E03-005 — Pending command requests](I03-E03-005-pending-command-requests.md)

## Sources and evidence

- [V1.0.0 module communication](../../../../../design/versions/V1.0.0/module-communication.md)
- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)
- [V1.0.0 lifecycle](../../../../../design/versions/V1.0.0/lifecycle.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
