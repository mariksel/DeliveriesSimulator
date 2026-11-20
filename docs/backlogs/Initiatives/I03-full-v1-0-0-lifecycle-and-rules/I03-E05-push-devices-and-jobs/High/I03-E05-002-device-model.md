# I03-E05-002 — Device model

| Field | Value |
| --- | --- |
| ID | `I03-E05-002` |
| Parent | [I03-E05 — Push, devices, and jobs](../I03-E05-push-devices-and-jobs-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Devices can be offline or in the background, and can receive duplicates, which are stated as
indirect effects. A push reaches an offline device when it returns.

## Acceptance criteria

- A built-in scenario covers an offline device and a duplicate.
- A device going offline is an indirect commit that the service can't see.

## Dependencies

- [I03-E05-001 — Push pipeline](I03-E05-001-push-pipeline.md)
- [I03-E02-013 — Indirect effects stated by hand](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-013-indirect-effects-stated-by-hand.md)

## Sources and evidence

- [Project foundation: FND-46](../../../../../design/decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail)
- [Notifications](../../../../../design/modules/notifications.md)
- [Project foundation: FND-81](../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
