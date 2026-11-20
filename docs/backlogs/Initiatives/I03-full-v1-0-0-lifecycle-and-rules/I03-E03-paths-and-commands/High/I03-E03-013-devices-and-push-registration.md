# I03-E03-013 — Devices and push registration

| Field | Value |
| --- | --- |
| ID | `I03-E03-013` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

A driver registers a device, and registers it for push notifications, ready for the push
pipeline.

## Acceptance criteria

- A built-in scenario registers a device and its push registration.
- The registered devices are what the push pipeline sends to.

## Dependencies

- [I03-E03-001 — Manual mode](I03-E03-001-manual-mode.md)

## Sources and evidence

- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)
- [Notifications](../../../../../design/modules/notifications.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
