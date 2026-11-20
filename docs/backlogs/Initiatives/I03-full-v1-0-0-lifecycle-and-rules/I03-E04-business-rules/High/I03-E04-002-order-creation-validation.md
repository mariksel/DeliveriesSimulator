# I03-E04-002 — Order creation validation

| Field | Value |
| --- | --- |
| ID | `I03-E04-002` |
| Parent | [I03-E04 — Business rules](../I03-E04-business-rules-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

The rules for creating an order, such as quantities and product line positions, and order items
as their own records.

## Acceptance criteria

- Each rule has a test for its limits.
- A refused creation is an input commit with no state commit.

## Dependencies

- [I03-E04-001 — Money, prices, and commission](I03-E04-001-money-prices-and-commission.md)

## Sources and evidence

- [V1.0.0 business rules](../../../../../design/versions/V1.0.0/business-rules.md)
- [Orders](../../../../../design/modules/orders.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
