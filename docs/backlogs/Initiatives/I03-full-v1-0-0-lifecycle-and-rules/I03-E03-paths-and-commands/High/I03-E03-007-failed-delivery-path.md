# I03-E03-007 — Failed delivery path

| Field | Value |
| --- | --- |
| ID | `I03-E03-007` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-11 |
| Completed | Not completed |

## Scope

A driver reports a failed delivery, and the order moves to `DeliveryAttemptFailed`, with what
can follow from there. A customer's decision not to pick up can be stated as the indirect effect
that led to it.

## Acceptance criteria

- A built-in scenario covers a failed attempt and a later delivery.
- The scenario links the customer's decision to the driver's report.
- The demonstration scenario gains a customer who won't take an order, which it leaves out until
  this path exists
  ([I03-E09-007](../../Archive/Done/I03-E09-city-and-map/Archive/Done/High/I03-E09-007-demonstration-scenario.md)).

## Dependencies

- [I03-E03-005 — Pending command requests](I03-E03-005-pending-command-requests.md)
- [I03-E02-013 — Indirect effects stated by hand](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-013-indirect-effects-stated-by-hand.md)

## Sources and evidence

- [V1.0.0 lifecycle](../../../../../design/versions/V1.0.0/lifecycle.md)
- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)
- [Project foundation: FND-81](../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-11 — Still Proposed, with one more criterion: the user left a customer who won't take an
  order out of the demonstration scenario until this path can settle that order
  ([FND-49](../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)).

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
