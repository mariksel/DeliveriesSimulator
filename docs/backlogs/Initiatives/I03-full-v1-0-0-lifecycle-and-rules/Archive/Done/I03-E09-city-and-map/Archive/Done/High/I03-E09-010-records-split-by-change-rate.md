# I03-E09-010 — Records split by change rate

| Field | Value |
| --- | --- |
| ID | `I03-E09-010` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-12 |
| Last updated | 2026-11-12 |
| Completed | 2026-11-12 |

## Scope

Goes through the records other than the driver, such as orders, deliveries, and notifications,
for parts that change at different rates, and gives each such part versions of its own, by the
rule the user chose in [FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions). The driver is split in
[I03-E09-008](../Normal/I03-E09-008-location-sends-at-city-scale.md). The user chose, from the audit, that an
order's status, driver, and ready flag come from its events, that Deliveries' copy of the order is
a record of its own, and that the other records stay as they are ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Acceptance criteria

- Each record's parts that change at different rates have versions of their own, or the item
  records why a record stays as it is.
- Every run's results stay those the rules give, with the pins and saved-run schema following.

## Dependencies

- [I03-E09-008 — Location sends at city scale](../Normal/I03-E09-008-location-sends-at-city-scale.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-11. The details are in
[FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-010-P01` | An order's status from its events | Done | 2026-11-12 | Implemented; Tested |
| `I03-E09-010-P02` | Deliveries' copy of the order | Done | 2026-11-12 | Implemented; Tested |

### Plan

After each phase, `npm run check` passes, and every run's digest is the same.

1. **P01, an order's status from its events:** an order's version keeps only whether a delivery
   request is pending. Its status, driver, and whether it is ready are read from the order's own
   events, and Orders gives each order's full view. Every reader uses that view: Orders' rules,
   the verification checks, the timeline, the Inspector, and the map.
2. **P02, Deliveries' copy of the order:** the copy becomes a record of its own, with versions
   made as Orders' events arrive, and a delivery's version keeps its state and driver. The
   timeline, the Inspector, and the reads know it as a record kind.

In each phase, saved runs move up a schema version and refuse a run saved before that holds
orders, and the pinned fingerprints of functions whose results change shape are updated in place.

## Status history

- 2026-11-12 — Created as Proposed: the user chose that parts of a record changing at different
  rates have versions of their own, and to go through every record now, after the driver, built
  right after I03-E09-008 ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)). It starts when its dependency is Done.
- 2026-11-12 — Moved from Proposed to Ready: its dependency, I03-E09-008, is Done.
- 2026-11-12 — Moved from Ready to In Progress: the user chose from the audit which records
  split, and approved the plan ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-12 — P01 Done, still In Progress: an order's version holds only whether a request is
  pending, and its status, driver, and readiness are read from its events through its full view,
  `OrderView`, with every run's digest the same. Saved runs are at schema version 7, and the eight
  pins of Orders' functions were updated in place. `npm run check` passes but for one end-to-end
  test that failed under the full suite's load and passed when run again
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-12 — P02 Done, and the item Done: Deliveries' copy of the order is a record
  of its own, `OrderCopy`, and a delivery's version holds its state and its driver, with every
  run's digest the same. Saved runs are at schema version 8, and the eight pins of Deliveries'
  functions were updated in place. `npm run check` passes
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-12 — Created at High priority, to be built right after I03-E09-008, as the user chose.
