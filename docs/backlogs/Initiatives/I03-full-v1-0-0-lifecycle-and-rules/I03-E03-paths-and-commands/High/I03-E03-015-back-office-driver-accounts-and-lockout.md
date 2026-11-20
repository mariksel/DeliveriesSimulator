# I03-E03-015 — Back-office driver accounts and lockout

| Field | Value |
| --- | --- |
| ID | `I03-E03-015` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-07 |
| Completed | Not completed |

## Scope

Back-office staff create and edit driver accounts, change an email, reset a password, change a
driver's status, and read and unlock a login lockout. Account management is kept simple, and
exists so that every `V1.0.0` command is covered.

Editing a driver can change their service area, which the real service blocks while the driver
holds an active order. `V1.0.0`'s docs don't state this yet, so this item adds it.

## Acceptance criteria

- A built-in scenario covers each back-office command.
- A password reset revokes the driver's sessions.

## Dependencies

- [I03-E03-014 — Sessions, session cache, and rate limits](I03-E03-014-sessions-session-cache-and-rate-limits.md)

## Sources and evidence

- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)
- [Deliveries](../../../../../design/modules/drivers.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
