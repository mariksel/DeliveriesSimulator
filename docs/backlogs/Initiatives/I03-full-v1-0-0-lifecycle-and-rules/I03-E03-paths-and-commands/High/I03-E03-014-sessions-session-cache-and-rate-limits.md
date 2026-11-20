# I03-E03-014 — Sessions, session cache, and rate limits

| Field | Value |
| --- | --- |
| ID | `I03-E03-014` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Sign in, refresh, and sign out, with the session state cache and rate limits for one instance.
This adds the library commit kind. The cache behaves as the real library does: a time limit
passing is no event, and a commit happens when the library removes an entry or a call changes
the cache. `I04` adds the cross-instance delays with multiple instances.

## Acceptance criteria

- A built-in scenario covers each session command, a revoked session, and a call refused by a
  rate limit.
- A cache hit makes no commit, and a read that finds an expired entry does.
- The values match module communication, and each time's random variation comes from the seed.

## Dependencies

- [I03-E03-001 — Manual mode](I03-E03-001-manual-mode.md)

## Sources and evidence

- [V1.0.0 module communication](../../../../../design/versions/V1.0.0/module-communication.md)
- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)
- [Project foundation: FND-81](../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
