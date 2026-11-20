# I03-E04-001 — Money, prices, and commission

| Field | Value |
| --- | --- |
| ID | `I03-E04-001` |
| Parent | [I03-E04 — Business rules](../I03-E04-business-rules-backlog.md) |
| Status | Ready |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | Not completed |

## Scope

Whole minor units in a branded `Money` type, order prices, the delivery fee, and commission. The
rounding rule for commission isn't in the `V1.0.0` docs, so it is read from the real service
when this item starts.

## Acceptance criteria

- Prices and commission match the business rules page in tests, including the rounding rule.
- Amounts can't be mixed with plain numbers without a conversion.

## Dependencies

- [I03-E02-002 — Records split with version chains](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-002-records-split-with-version-chains.md)

## Sources and evidence

- [V1.0.0 business rules](../../../../../design/versions/V1.0.0/business-rules.md)
- [Project foundation: FND-80](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-80--planning-stage-i03)
- [Code style](../../../../../design/governance/code-style.md)
- [Payments](../../../../../design/modules/payments.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Moved from Proposed to Ready: its dependency I03-E02-002 is Done. The user
  chose that an item is Ready once its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
