# I03-E05-006 — Job schedule view

| Field | Value |
| --- | --- |
| ID | `I03-E05-006` |
| Parent | [I03-E05 — Push, devices, and jobs](../I03-E05-push-devices-and-jobs-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Job schedule view: shows when each background job ran and what it did.

## Acceptance criteria

- Job schedule view shows this for a run of `V1.0.0`, and follows the selected commit on the
  timeline.
- Empty runs are shown, as every run is recorded.

## Dependencies

- [I03-E05-004 — Cleanup jobs and retention](I03-E05-004-cleanup-jobs-and-retention.md)

## Sources and evidence

- [Technical view](../../../../../design/modules/technical-view.md)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)
- [Project foundation: FND-81](../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
