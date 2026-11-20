# I03-E02-024 — Saved-run screens and deleting branches

| Field | Value |
| --- | --- |
| ID | `I03-E02-024` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-08 |
| Last updated | 2026-11-10 |
| Completed | 2026-11-10 |

## Scope

The screens for saved runs, and deleting a branch, as
[FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
records:

- **Save:** in the run controls, opening a small form in the page with the name, filled in with
  the scenario's name and the date, and the level. Saving pauses the run, saves, and resumes
  it. A run that doesn't fit is not saved, and a message says so and offers "minimum".
- **The list:** on the Runs and scenarios page, below the built-in scenarios, each saved run
  with its name, level, and size: bytes, commits, and branches. Each can be opened, moved to the
  other level, and deleted after a confirmation in the page.
- **Opening:** a saved run opens like a live run, paused at its latest commit, and can be moved
  through, forked, and run on. It replaces the run being watched, with a warning first if that
  run is not saved. Opening at "minimum" shows the rebuild's progress.
- **Deleting a branch:** only a branch with no forks of its own, never Main, after a
  confirmation in the page, on a live run and a saved run alike. If it is the branch being
  watched, the branch it forked from is watched, at its latest commit.

`I05` 's Stored run management adds the rest.

## Acceptance criteria

- A run saved from the run controls appears in the list with its name, level, and size, and
  opens like a live run, showing the same timeline.
- A run that doesn't fit is not saved, and the message offers "minimum".
- Moving a run's level, deleting a run, and opening over an unsaved run each confirm first in
  the page.
- Only a branch with no forks of its own, other than Main, can be deleted; deleting the branch
  being watched watches its parent.

## Dependencies

- [I03-E02-008 — Saved runs at two levels](I03-E02-008-saved-runs-at-two-levels.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Project foundation: FND-87](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)
- [Run history](../../../../../../../../../design/modules/run-history.md)

## Internal phases

The user approved the plan below on 2026-11-08, so the implementer starts at P01.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-024-P01` | Save, from the run controls | Done | 2026-11-09 | Approved; Built; `npm run check` passes |
| `I03-E02-024-P02` | The list of saved runs, and opening one | Done | 2026-11-09 | Approved; Built; `npm run check` passes |
| `I03-E02-024-P03` | Deleting a branch | Done | 2026-11-10 | Approved; Built; `npm run check` passes |

### Plan

After each phase, `npm run check` passes.

1. **P01, saving:** a Save button in the run controls of `run-workspace` opens a form below them,
   as the indirect effect form does, with the name and the level. The watched run pauses, saves
   through `watched-run.ts`, and resumes; the storage-full failure shows its message and offers
   "minimum".
2. **P02, the list:** `src/ui/runs/runs-page` lists the saved runs with name, level, and size,
   with Open, Move to the other level, and Delete, each confirming in the page where FND-81 says
   so. Opening builds a live run from the saved run and its scenario version, through
   `live-scenario-run.ts` and `watched-run.ts`, showing progress at "minimum".
3. **P03, deleting a branch:** removing a branch with no forks of its own in
   `run-branches.ts` and the run's history, saved too when the run is a saved one, and a delete
   icon in a branch's column heading. The Run history and UI pages and the end-to-end tests
   follow.

## Status history

- 2026-11-08 — Created as Proposed: split from I03-E02-008 when the user chose items of at most
  about three phases. It starts when I03-E02-008 is Done. Its phases are recorded as the
  approved plan (FND-81).
- 2026-11-09 — Moved from Proposed to Ready: its dependency I03-E02-008 is Done.
- 2026-11-09 — P01 Done: Save in the run controls opens a form below them with the name
  offered, the scenario's name and the date and time, and the level; a running run pauses while
  it saves and goes on, and a run that does not fit keeps the form open with why and Save at
  minimum. A saved run's time now comes from a calendar, as the wall clock I03-E02-008 stored
  only measures time passing. `npm run check` passes; one full run had a WebKit end-to-end test
  time out under load, which passed 15 times alone and on the rerun (FND-81).
- 2026-11-09 — P02 Done: the Runs and scenarios page lists saved runs newest first with Open,
  a move to the other level, and Delete, each asking first in the row, Open only over a run with
  changes not saved; a saved run opens with its scenario version, paused at its latest commit or
  ended and judged, showing the commits loaded. A new end-to-end test found that a tooltip left
  showing on a focused button took clicks meant for what it covered, as the CDK's own pane rule
  outranked the tooltip's; its pane now lets the pointer through, which a test checks, and the
  WebKit timeouts seen in full runs since I03-E02-016 stopped. `npm run check` passes (FND-81).
- 2026-11-10 — Detail chosen by the user while building P03: deleting a branch removes it from
  the run being watched and from the saved run it was opened from or last saved as, rewritten
  under its ID, leaving the rest of that saved run as it was saved (FND-81).
- 2026-11-10 — P03 Done, and the item Done: a trash icon in the heading of each branch with no forks
  of its own, never Main, asks first in the heading; deleting the branch being watched watches the
  one it forked from, and the saved run the run came from or was last saved as loses the branch
  too, at either level, which a test shows gives the same run as deleting it in memory.
  `npm run check` passes; full runs still had one or two WebKit end-to-end tests time out in
  Playwright's wait for an element to be stable, a different test each time, passing alone and on
  the rerun, which passed all 372 (FND-81).

## Priority history

- 2026-11-08 — Created at High priority, like the epic's other items.
