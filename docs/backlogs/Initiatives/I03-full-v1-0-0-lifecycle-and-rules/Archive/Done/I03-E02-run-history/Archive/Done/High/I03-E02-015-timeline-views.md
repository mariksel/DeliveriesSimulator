# I03-E02-015 — Timeline views

| Field | Value |
| --- | --- |
| ID | `I03-E02-015` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-09 |
| Completed | 2026-11-09 |

## Scope

The four views over the same commits: by simulated time, by number, by order, and by driver. The
rows' two modes from I03-E02-014 become the first two. A commit can appear in more than one
view, and selecting it goes to the same commit. A new grouping works on old runs.

A switch in the timeline panel picks a view. Branches stay columns in every view, and the
selected commit stays selected when the view changes. FND-81 says which commits an order and a
driver hold; a commit that touches none is not in that view. Inside an order or a driver, each
job run or API call groups its commits, and a job run is shown whole. A selected order or driver
is highlighted in every timeline view; I03-E07-007 links the other views to it.

The view by order is the Order timeline and Order replay capabilities, delegated here from
I03-E06-007 and I03-E06-018, and opening an order also shows its version chain. The view by
driver starts Driver timelines, whose driver states come in `I07`.

The commits that touched each order and driver come from I03-E02-021's index, which records
the commits that made a version of each record. By order and by driver, the zoom
switch offers Orders (or Drivers), Work, and Commits. Selecting an order shows its versions in
the Inspector, each linked to the commit that made it (FND-81).

## Acceptance criteria

- Each view shows the same commit under its own hierarchy.
- Selecting a commit in one view selects it in the others.
- The views stay responsive on a full city day, using a cache where needed: it can be followed
  live in every view, and switching views takes about as long as switching the rows' mode did, as
  measured and accepted by the user on 2026-11-09 (FND-81).
- A selected order or driver is highlighted in every timeline view.
- For a run of `V1.0.0`, the view by order shows everything that happened to an order in both
  modules, and its version chain, and follows the selected commit, as Order timeline and Order
  replay need.

## Dependencies

- [I03-E02-014 — Zoomable timeline](I03-E02-014-zoomable-timeline.md)
- [I03-E02-021 — Links across the sub-roots](I03-E02-021-links-across-the-sub-roots.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Run history: Timeline](../../../../../../../../../design/modules/run-history.md#timeline)
- [I03-E06-007 — Order timeline](../../../../../../I03-E06-explaining-views/Archive/Delegated/High/I03-E06-007-order-timeline.md),
  delegated here
- [I03-E06-018 — Order replay](../../../../../../I03-E06-explaining-views/Archive/Delegated/High/I03-E06-018-order-replay.md),
  delegated here
- [Capability ownership](../../../../../../../../../design/modules/capability-ownership.md)

## Internal phases

The user approved the plan below on 2026-11-08. P01 was cancelled on 2026-11-09, so the
implementer starts at P02.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-015-P01` | The orders and drivers each commit touched | Cancelled | 2026-11-09 | Approved |
| `I03-E02-015-P02` | The views by order and by driver | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-015-P03` | The switch, the highlight, and an order's versions | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-015-P04` | A city day followed live, and the pages | Done | 2026-11-09 | Approved; Implemented |

### Plan

After each phase, `npm run check` passes.

1. **P01, cancelled:** I03-E02-021's index and its `commitsTouching` give the commits that
   touched each order and driver, so this item builds no index of its own.
2. **P02, the views:** `RowMode` in `timeline-grid.ts` becomes a view with four values: by time,
   by number, by order, and by driver. By order and by driver, rows group each order or driver,
   then each job run or API call, shown whole, then its commits in time order, with the zoom
   levels Orders (or Drivers), Work, and Commits. A commit can sit under several orders, so a
   row is named by its view, its group, and its commit, and selection stays by commit.
3. **P03, the switch:** `timeline-panel` gets the view switch; `watched-run-store.ts` keeps the
   view, the selected commit across switches, and the selected order or driver, which every view
   highlights. Selecting an order shows its versions in the Inspector, each linked to the commit
   that made it.
4. **P04, a city day:** a city day is followed live in every view, and switching views takes
   about as long as switching the rows' mode did, using caches where needed; the numbers go to
   the user if not. The Run history, UI, and capability ownership pages and the end-to-end tests
   follow.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Moved from Proposed to Ready: its dependency I03-E02-014 is Done. The user chose
  that an item is Ready once its dependencies are Done, and its open questions are settled when
  it is planned.
- 2026-11-08 — Scope widened: the user chose four views, the rows' two modes becoming views of
  their own, picked by a switch with branches kept as columns, and which commits an order and a
  driver hold (FND-81).
- 2026-11-08 — Details chosen by the user: groups inside an order or driver, whole job runs,
  highlighting a selected order or driver here rather than in I03-E07-007, and what responsive
  means, which adds a fourth acceptance criterion and makes the third measurable (FND-81).
- 2026-11-08 — Scope widened: the user chose that the view by order is Order timeline and Order
  replay, with the order's version chain, and the view by driver starts Driver timelines. The
  three capabilities move to Run history, and I03-E06-007 and I03-E06-018 are delegated here,
  adding a fifth acceptance criterion from theirs (FND-81).
- 2026-11-08 — Moved from Ready to Proposed, and planned: the user chose that this item depends
  on I03-E02-021, which is not Done, and uses its links; chose the zoom levels by order and by
  driver and the Inspector for an order's versions; and approved the phases below (FND-81).
- 2026-11-09 — P01 cancelled by the user: I03-E02-021 now keeps an index of the commits that
  touched each record, in the run's cache, so the views read it rather than build their own.
  The item stays Proposed until 021 is Done (FND-81).
- 2026-11-09 — Moved from Proposed to Ready: its dependencies I03-E02-014 and I03-E02-021 are
  Done. 021's `commitsTouching` and index give the commits that touched each order and driver.
- 2026-11-09 — Choices made by the user while building, on a city day's numbers: by order at the
  middle zoom, about 450 ms to work the rows out again on each change, against about 75 ms by
  time, is accepted and recorded, and a cache for the rows' views can be an item of its own; and
  the grids by order and by driver are made the first time their view is chosen, as keeping all
  four from the start holds about 500 MB more. The third acceptance criterion follows (FND-81).
- 2026-11-09 — Done: all three phases left are built, and `npm run check` passes. A job run or
  API call goes under the orders and drivers it made versions of or read, shown whole, and a
  branch that is not current has its index worked out; an order's or driver's Highlight button
  highlights its commits in every view, and an order's versions show in the Inspector tab, each
  linked to the commit that made it. The figures are in the Run history page's Timeline section.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
