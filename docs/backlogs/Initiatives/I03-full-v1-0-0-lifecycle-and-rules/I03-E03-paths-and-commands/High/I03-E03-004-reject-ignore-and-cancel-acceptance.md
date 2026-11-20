# I03-E03-004 — Reject, ignore, and cancel acceptance

| Field | Value |
| --- | --- |
| ID | `I03-E03-004` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

The driver commands deliveries decides alone on a request: reject, ignore, and cancel an
acceptance, with their rules and the notification slot that ignoring frees.

## Acceptance criteria

- A built-in scenario covers each command, and its refusals.
- The events and statuses match the lifecycle page.

## Dependencies

- [I03-E03-001 — Manual mode](I03-E03-001-manual-mode.md)

## Sources and evidence

- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)
- [V1.0.0 lifecycle](../../../../../design/versions/V1.0.0/lifecycle.md)
- [V1.0.0 business rules](../../../../../design/versions/V1.0.0/business-rules.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
