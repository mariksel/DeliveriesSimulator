# I03-E04-004 — Ranking and the dispatch sequence

| Field | Value |
| --- | --- |
| ID | `I03-E04-004` |
| Parent | [I03-E04 — Business rules](../I03-E04-business-rules-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-07 |
| Completed | Not completed |

## Scope

Driver ranking and the notification sequence: re-checking eligibility and rank on each pass,
notifying at most one driver per open request, and the limit on outstanding notifications.

## Acceptance criteria

- Tests show the order of notifications for a set of drivers.
- The values are tunable, and match the rules page by default.

## Dependencies

- [I03-E04-003 — Eligibility rules in full](I03-E04-003-eligibility-rules-in-full.md)

## Sources and evidence

- [V1.0.0 business rules](../../../../../design/versions/V1.0.0/business-rules.md)
- [V1.0.0 module communication](../../../../../design/versions/V1.0.0/module-communication.md)
- [Deliveries](../../../../../design/modules/drivers.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
