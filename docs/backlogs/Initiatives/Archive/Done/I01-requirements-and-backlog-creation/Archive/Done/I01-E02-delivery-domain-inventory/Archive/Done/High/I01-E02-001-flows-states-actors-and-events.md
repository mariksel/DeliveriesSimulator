# I01-E02-001 — Flows, states, actors, and events

| Field | Value |
| --- | --- |
| ID | `I01-E02-001` |
| Parent | [I01-E02 — Delivery domain inventory](../../../I01-E02-delivery-domain-inventory-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Produce the inventory of lifecycle flows, states, actors, commands, and event kinds in the
orders and deliveries modules, for the user to confirm.

### Questions for the user

- Where should the inventory be recorded, given FND-23?
- Should it cover only implemented behaviour, or also approved designs that are not built yet?
- How much of the order itself matters, such as products, prices, and customers?
- How should each conflict found between the sources be resolved? FND-9 requires asking, so they
  are presented to the user one by one.

### Answers so far

- Location: per version,
  [FND-36](../../../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-36--inventory-per-version).
- Coverage: built behaviour, approved designs, and undecided options,
  [FND-37](../../../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-37--inventory-coverage).
- Order detail: products, prices, customers, and restaurants,
  [FND-38](../../../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-38--order-detail).
- Confirmed by the user on 2026-11-03 for `V1.0.0`:
  [lifecycle](../../../../../../../../../../../design/versions/V1.0.0/lifecycle.md),
  [actors and commands](../../../../../../../../../../../design/versions/V1.0.0/actors-and-commands.md),
  and [events](../../../../../../../../../../../design/versions/V1.0.0/events.md).
- Confirmed by the user on 2026-11-03 for `V1.1.0-planned-dispatch`, whose contents they
  chose:
  [its pages](../../../../../../../../../../../design/versions/V1.1.0-planned-dispatch/README.md).
- Corrected on 2026-11-03: the module copies are built in `V1.0.0`, so `V2.0.0-module-copies`
  was dropped and FND-39's entry about U1 to U10 was replaced. The earlier conflict rested on a
  stale reading of the real service's record.
- Undecided options, collected on 2026-11-03 from re-read sources: the location send interval is
  an option switch in `V1.0.0`; the questions of unbuilt features wait in the version index.
- Conflicts: resolved one by one in
  [FND-39](../../../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-39--source-conflicts-resolved).
  More remain to be presented.

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-001 — Confirm purpose and success](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)

## Sources and evidence

- [Project foundation: FND-9](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-9--sources-of-business-rules)
- [Project foundation: FND-27](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-27--covered-in-stages)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependency, I01-E01-001,
  is Done. No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Paused, still In Progress: the user chose to settle I01-E04-001, what a version
  is, first, because the inventory is written per version (FND-36).
- 2026-11-03 — Moved from In Progress to Done on the user's approval: the inventory decisions
  are in FND-36 to FND-38 and FND-45, the conflicts in FND-39, and the confirmed version pages
  for `V1.0.0` and `V1.1.0-planned-dispatch` are in `docs/design/versions/`. Archived under
  `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
