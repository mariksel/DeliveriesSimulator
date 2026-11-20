# I03-E04-003 — Eligibility rules in full

| Field | Value |
| --- | --- |
| ID | `I03-E04-003` |
| Parent | [I03-E04 — Business rules](../I03-E04-business-rules-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-07 |
| Completed | Not completed |

## Scope

Every eligibility rule, in the order the real service checks them, with the code of the first
rule that fails.

## Acceptance criteria

- Each rule has a test for passing and failing, and the first failing code matches the rules
  page.
- Dispatch and driver commands use the same rules.

## Dependencies

- [I03-E03-012 — Driver status and location](../../I03-E03-paths-and-commands/High/I03-E03-012-driver-status-and-location.md)

## Sources and evidence

- [V1.0.0 business rules](../../../../../design/versions/V1.0.0/business-rules.md)
- [Deliveries](../../../../../design/modules/drivers.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
