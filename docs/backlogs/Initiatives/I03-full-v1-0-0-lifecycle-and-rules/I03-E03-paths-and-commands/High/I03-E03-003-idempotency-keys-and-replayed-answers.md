# I03-E03-003 — Idempotency keys and replayed answers

| Field | Value |
| --- | --- |
| ID | `I03-E03-003` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Order creation, every restaurant command, and every driver command except ignore take an
idempotency key. A repeated key with the same request replays the first answer, and with a
different request is a conflict. Records last 30 days, and an expired one still present says the
key expired.

## Acceptance criteria

- A built-in scenario shows a replay, a conflict, and an expired key.
- A replay makes an input commit and no state commit.

## Dependencies

- [I03-E03-001 — Manual mode](I03-E03-001-manual-mode.md)

## Sources and evidence

- [V1.0.0 module communication](../../../../../design/versions/V1.0.0/module-communication.md)
- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
