# I03-E04-007 — Rule evaluation log

| Field | Value |
| --- | --- |
| ID | `I03-E04-007` |
| Parent | [I03-E04 — Business rules](../I03-E04-business-rules-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | Not completed |

## Scope

Rule evaluation log: records every rule evaluation with its inputs and result, read from
commits, without adding commits of its own.

Breakpoints on rules come with it, moved from the
[Step debugger](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-011-step-debugger.md)
on 2026-11-08
([FND-88](../../../../../design/decisions/project-foundation/run-history.md#fnd-88--step-debugger)):
a run pauses where a rule is evaluated, as it does at a breakpoint on an event.

## Acceptance criteria

- Every evaluation of a rule in a run can be listed with its inputs and result.
- Recording evaluations makes no commit, as it changes no state.
- A run pauses at a breakpoint on a rule, and can continue from there.

## Dependencies

- [I03-E04-004 — Ranking and the dispatch sequence](I03-E04-004-ranking-and-the-dispatch-sequence.md)

## Sources and evidence

- [Business rules](../../../../../design/modules/business-rules.md)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)
- [Project foundation: FND-81](../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Scope widened: breakpoints on rules moved here from I03-E02-011, as they need the
  record of each rule's evaluation this item makes (FND-88).

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
