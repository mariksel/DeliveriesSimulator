# I03-E03-001 — Manual mode

| Field | Value |
| --- | --- |
| ID | `I03-E03-001` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Ready |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | Not completed |

## Scope

Manual mode: the user acts as a driver or restaurant and steps through the flow by hand, so each
path can be tried as it arrives. Each action is an input commit.

An action can name the label of an indirect effect stated by hand, which
[I03-E02-022](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-022-indirect-effect-labels-and-config-change-links.md)
lets the form give, so its API call records the indirect commit it follows from. Only Manual
mode's actions can name such a label
([FND-89](../../../../../design/decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)).

## Acceptance criteria

- The user can issue any command built so far, as any actor, and see the response.
- Actions by hand appear on the timeline like any other input commit.

## Dependencies

- [I03-E02-005 — Direct effect commits and their groups](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-005-direct-effect-commits-and-their-groups.md)

## Sources and evidence

- [Simulation engine](../../../../../design/modules/simulation-engine.md)
- [Project foundation: FND-80](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-80--planning-stage-i03)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Scope widened: the user chose that only Manual mode's actions name the label of an
  indirect effect stated by hand (FND-89).
- 2026-11-08 — Moved from Proposed to Ready: its dependency I03-E02-005 is Done. The user
  chose that an item is Ready once its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
