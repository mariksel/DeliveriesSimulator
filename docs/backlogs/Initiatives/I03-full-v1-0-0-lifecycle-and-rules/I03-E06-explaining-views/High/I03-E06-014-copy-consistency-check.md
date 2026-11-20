# I03-E06-014 — Copy consistency check

| Field | Value |
| --- | --- |
| ID | `I03-E06-014` |
| Parent | [I03-E06 — Explaining views](../I03-E06-explaining-views-backlog.md) |
| Status | Ready |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | Not completed |

## Scope

Copy consistency check: at any step, compares each module's copy of the other's data with the
original. It may follow links across the modules, as views and checks can.

## Acceptance criteria

- Copy consistency check shows this for a run of `V1.0.0`, and follows the selected commit on
  the timeline.

## Dependencies

- [I03-E02-003 — Commits and the main root](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-003-commits-and-the-main-root.md)

## Sources and evidence

- [Technical view](../../../../../design/modules/technical-view.md)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)
- [Project foundation: FND-81](../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Moved from Proposed to Ready: its dependency I03-E02-003 is Done. The user
  chose that an item is Ready once its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
