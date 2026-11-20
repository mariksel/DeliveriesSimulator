# I03-E02-002 — Records split with version chains

| Field | Value |
| --- | --- |
| ID | `I03-E02-002` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-07 |
| Completed | 2026-11-05 |

## Scope

Split every record that changes into an unchanging part and a version part, such as `IOrder` and
`IOrderVersion`. Each version links directly to its previous one, and the state holds the
latest. A version's number is today's order version. Order items become their own records with
an `orderId`.

### Outcome

- Orders, deliveries, drivers, notifications, and orders' copy of a delivery each have an
  unchanging part and a version part, and each version links to its previous one.
- `IOrderCopy` stays inside the delivery's version, as it changes with it.
- A driver's area is in the version part, because the real service lets it change.
- An existing rule was broken: reading the orders outbox edited a recorded delivery event, to link
  it. That link is now a separate record, so events really never change.
- The pinned digest `824be9ddc2eee257` holds, and the city day's digest `7958d5c3f0bc7e68` matches
  the code before this change. A city day went from 40.1 s and 649 MB to 41.8 s and 794 MB.
- There are no order items yet, so
  [I03-E04-002](../../../../../../I03-E04-business-rules/High/I03-E04-002-order-creation-validation.md)
  creates them as their own records.

## Acceptance criteria

- Every record that changes has the two parts, and events and outbox rows have no version part.
- An order's history can be read by following its version chain.
- Rule functions stay plain and pure, and the pinned digest doesn't change.

## Dependencies

- [I03-E02-001 — Run history design page](I03-E02-001-run-history-design-page.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Orders](../../../../../../../../../design/modules/orders.md)
- [Deliveries](../../../../../../../../../design/modules/drivers.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-05 — Moved from Proposed to Ready: its dependency I03-E02-001 is Done.
- 2026-11-05 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-05 — Moved from In Progress to Done: every record that changes has its two parts, with
  version chains. npm run check passes, and both pinned digests hold.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
