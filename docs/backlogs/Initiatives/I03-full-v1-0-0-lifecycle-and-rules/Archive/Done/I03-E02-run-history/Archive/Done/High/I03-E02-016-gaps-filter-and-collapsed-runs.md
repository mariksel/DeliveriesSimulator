# I03-E02-016 — Gaps, filter, and collapsed runs

| Field | Value |
| --- | --- |
| ID | `I03-E02-016` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-09 |
| Completed | 2026-11-09 |

## Scope

The timeline shows simulated time, and large gaps between state commits are visible in two
displays you can switch between: a list with a row stating the gap, and an axis with spacing to
scale. Neighbouring empty job runs collapse into one row you can zoom into, and a filter shows
or hides each kind of commit.

A gap is the simulated time between two neighbouring rows as shown, after the filter and
collapsing. The threshold starts at 1 minute, with a control on the timeline panel, and the
axis spaces rows by the logarithm of the gap, from no extra space at the threshold to at most
five rows' height for the longest gap shown. Gaps show, as a row or on the axis, in the view by
time only (FND-81).

A job run with no state commit is empty. Back-to-back empty runs of any job collapse into one
row, which opens to them grouped by job, each job's runs collapsed again. Hiding a kind hides
only its own commits. The filter, the threshold, and the list or axis choice stay with the
person watching while the app is open, and are not saved with the run.

## Acceptance criteria

- A gap past a threshold you can tune shows its length in the list, and its size on the axis.
- Empty job runs stay selectable after collapsing.
- The filter works in every timeline view.

## Dependencies

- [I03-E02-015 — Timeline views](I03-E02-015-timeline-views.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Run history: Timeline](../../../../../../../../../design/modules/run-history.md#timeline)

## Internal phases

The user approved the plan below on 2026-11-08, so the implementer starts at P01.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-016-P01` | The filter, and collapsed empty job runs | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-016-P02` | Gap rows and the threshold | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-016-P03` | The axis, with rows of varying height | Done | 2026-11-09 | Approved; Implemented |

### Plan

After each phase, `npm run check` passes.

1. **P01, filter and collapsing:** in `timeline-grid.ts`, a filter by commit kind applies before
   grouping, in every view. When it hides the selected commit's kind, the selection stays and
   the nearest shown row is marked as holding it. Back-to-back empty job runs of any job
   collapse into one row, which opens to them grouped by job, each job's runs collapsed again,
   and each stays selectable. The panel gets the filter's controls, kept with the person
   watching while the app is open.
2. **P02, gap rows:** in the view by time, a row states each gap longer than the threshold
   between neighbouring rows as shown; the threshold starts at 1 minute, with a control on the
   panel.
3. **P03, the axis:** a switch between the gap rows and an axis, where a row's spacing grows with
   the logarithm of the gap before it, from none at the threshold to at most five rows' height.
   The panel's `cdk-virtual-scroll-viewport` has a fixed row height (`ROW_HEIGHT_PX`), so a
   custom virtual scroll strategy with precomputed offsets replaces it in the view by time, and
   following and scrolling to a commit use it. The Run history and UI pages and the end-to-end
   tests follow.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Details chosen by the user: which gap is measured, the threshold's start and
  control, and the axis's scale (FND-81).
- 2026-11-08 — More details chosen by the user: the axis in the view by time only, nested
  collapsing of empty job runs, what hiding a kind hides, and keeping the choices with the person
  watching (FND-81).
- 2026-11-08 — Gaps in the view by time only, as a row or on the axis, as the user chose
  (FND-81).
- 2026-11-08 — The user chose the axis's limits: no extra space at the threshold, at most five
  rows' height for the longest gap (FND-81).
- 2026-11-08 — Planned: the user chose that a hidden selected commit stays selected, marked on
  the nearest shown row, and approved the phases below (FND-81).
- 2026-11-09 — Moved from Proposed to Ready: its dependency I03-E02-015 is Done.
- 2026-11-09 — Detail chosen by the user while building: the Commits zoom leaves collapsed
  empty job runs closed, and they open by hand or to show the commit shown or the event
  selected (FND-81).
- 2026-11-09 — Done: all three phases are built, and `npm run check` passes. The filter works in
  every view, two or more back-to-back empty job runs collapse into one row that opens to them
  by job, and in the view by time gaps past a threshold show as rows or as space on an axis,
  which a virtual scroll with rows of varying height draws. The figures are in the Run history
  page's Timeline section.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
