# I03-E07-004 — Violation summary

| Field | Value |
| --- | --- |
| ID | `I03-E07-004` |
| Parent | [I03-E07 — Run tools and workspace](../I03-E07-run-tools-and-workspace-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Violation summary: counts the violations of each invariant, for one run, shaped so later stages
extend it across many runs.

## Acceptance criteria

- Each invariant shows its count of violations, using the existing run with a bug in tests.
- Its data doesn't assume there is only one run.

## Dependencies

- [I03-E03-011 — Payment return path](../../I03-E03-paths-and-commands/High/I03-E03-011-payment-return-path.md)

## Sources and evidence

- [Verification](../../../../../design/modules/verification.md)
- [Project foundation: FND-81](../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
