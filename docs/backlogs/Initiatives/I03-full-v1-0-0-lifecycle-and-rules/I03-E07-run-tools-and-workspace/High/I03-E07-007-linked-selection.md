# I03-E07-007 — Linked selection

| Field | Value |
| --- | --- |
| ID | `I03-E07-007` |
| Parent | [I03-E07 — Run tools and workspace](../I03-E07-run-tools-and-workspace-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | Not completed |

## Scope

Linked selection: selecting an order, driver, or event in one view highlights it in every other
view. The timeline views highlight a selected order or driver themselves, which I03-E02-015
builds; this item links the other views to them.

## Acceptance criteria

- A selection in any view shows in the others, including the timeline views.
- Clearing it clears it everywhere.

## Dependencies

- [I03-E02-015 — Timeline views](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-015-timeline-views.md)

## Sources and evidence

- [UI section](../../../../../design/ui/README.md)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)
- [Project foundation: FND-81](../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Scope narrowed: the user chose that I03-E02-015 highlights a selected order or
  driver in the timeline views, so this item links the other views to them (FND-81).

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
