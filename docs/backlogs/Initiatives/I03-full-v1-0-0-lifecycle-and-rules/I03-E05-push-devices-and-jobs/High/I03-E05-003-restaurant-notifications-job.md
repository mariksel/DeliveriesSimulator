# I03-E05-003 — Restaurant notifications job

| Field | Value |
| --- | --- |
| ID | `I03-E05-003` |
| Parent | [I03-E05 — Push, devices, and jobs](../I03-E05-push-devices-and-jobs-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

The job that reads accepted delivery requests from the orders outbox, and turns them into
restaurant pushes.

## Acceptance criteria

- A built-in scenario shows a restaurant being notified of an accepted request.
- The job's run is a commit, with what it did grouped under it.

## Dependencies

- [I03-E05-001 — Push pipeline](I03-E05-001-push-pipeline.md)

## Sources and evidence

- [V1.0.0 module communication](../../../../../design/versions/V1.0.0/module-communication.md)
- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
