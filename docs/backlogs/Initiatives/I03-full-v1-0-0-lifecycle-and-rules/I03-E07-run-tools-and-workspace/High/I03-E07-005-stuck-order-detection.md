# I03-E07-005 — Stuck-order detection

| Field | Value |
| --- | --- |
| ID | `I03-E07-005` |
| Parent | [I03-E07 — Run tools and workspace](../I03-E07-run-tools-and-workspace-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Stuck-order detection: finds orders that can never finish, such as a request with no eligible
driver.

## Acceptance criteria

- A built-in scenario with a stuck order is detected, and a run with none reports none.
- The result says which order, and why.

## Dependencies

- [I03-E04-003 — Eligibility rules in full](../../I03-E04-business-rules/High/I03-E04-003-eligibility-rules-in-full.md)

## Sources and evidence

- [Verification](../../../../../design/modules/verification.md)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
