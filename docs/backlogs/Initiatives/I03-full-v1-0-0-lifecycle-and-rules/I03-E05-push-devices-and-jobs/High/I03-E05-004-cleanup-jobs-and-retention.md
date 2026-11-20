# I03-E05-004 — Cleanup jobs and retention

| Field | Value |
| --- | --- |
| ID | `I03-E05-004` |
| Parent | [I03-E05 — Push, devices, and jobs](../I03-E05-push-devices-and-jobs-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

The daily jobs that remove expired outbox, inbox, retry, idempotency, notification, and location
records, at their real times and retentions.

## Acceptance criteria

- A built-in scenario runs long enough to show each cleanup removing records past their limit.
- Records within their limit stay.

## Dependencies

- [I03-E03-003 — Idempotency keys and replayed answers](../../I03-E03-paths-and-commands/High/I03-E03-003-idempotency-keys-and-replayed-answers.md)
- [I03-E03-005 — Pending command requests](../../I03-E03-paths-and-commands/High/I03-E03-005-pending-command-requests.md)

## Sources and evidence

- [V1.0.0 module communication](../../../../../design/versions/V1.0.0/module-communication.md)
- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
