# I03-E03-005 — Pending command requests

| Field | Value |
| --- | --- |
| ID | `I03-E03-005` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Driver commands that call orders store a pending request first. The retry job repeats the call
with backoff, and dead-letters it at 15 minutes old. A scenario can mark one call as failing,
and `I04` replaces that step with real fault injection.

The pending request adds a commit to each driver command that calls orders, so a pickup goes from
two commits to three.

## Acceptance criteria

- A built-in scenario shows a retry that succeeds, and a request that gives up.
- A refusal found by the job writes `DriverCommandRefused`.
- The pending request's commit comes before the call to orders.

## Dependencies

- [I03-E03-001 — Manual mode](I03-E03-001-manual-mode.md)

## Sources and evidence

- [V1.0.0 module communication](../../../../../design/versions/V1.0.0/module-communication.md)
- [V1.0.0 failures](../../../../../design/versions/V1.0.0/failures.md)
- [Project foundation: FND-80](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-80--planning-stage-i03)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
