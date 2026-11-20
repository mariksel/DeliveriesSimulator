# I03-E06-018 — Order replay

| Field | Value |
| --- | --- |
| ID | `I03-E06-018` |
| Parent | [I03-E06 — Explaining views](../../../I03-E06-explaining-views-backlog.md) |
| Status | Delegated |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | 2026-11-08 |
| Delegated to | [I03-E02-015 — Timeline views](../../../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-015-timeline-views.md) |

## Scope

Order replay: shows the commits that touched one order, and its version chain. FND-81 settled
this meaning, so the capability's wording needs updating to match.

## Acceptance criteria

- Order replay shows this for a run of `V1.0.0`, and follows the selected commit on the
  timeline.
- The capability's description matches this meaning.

## Dependencies

- [I03-E02-015 — Timeline views](../../../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-015-timeline-views.md)

## Sources and evidence

- [Orders](../../../../../../../design/modules/orders.md)
- [Project foundation: FND-34](../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)
- [Project foundation: FND-81](../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Delegated to I03-E02-015: the user chose that the timeline's view by order
  is Order replay, so the work moves there and Run history owns the capability (FND-81).
  Moved to the Delegated archive.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
