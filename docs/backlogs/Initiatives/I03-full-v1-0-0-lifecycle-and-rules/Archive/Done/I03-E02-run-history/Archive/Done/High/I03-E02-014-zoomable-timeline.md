# I03-E02-014 — Zoomable timeline

| Field | Value |
| --- | --- |
| ID | `I03-E02-014` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | 2026-11-08 |

## Scope

Rescoped on 2026-11-07
([FND-87](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)):
the tree of timelines and the timeline of commits are one view, in which each branch shows every
DAG root along it as a sequence of commits. It replaces the event list at the bottom of the run
workspace.

Each timeline has its own column. A fork's column starts at its fork point, joined by a line to
its parent's commit, and a commit before a fork point shows once, in the parent's column. Rows
line up in one of two modes a person switches between: by time, where each simulated time is a
band as tall as its busiest column, and by commit number, where row n holds commit n of each
column.

Every commit can be selected, in a recursive hierarchy of groups that opens and closes across
every column at once, and a commit expands to the events it holds. Plain functions work the
groups out from the commits for display, and nothing extra is saved except which job run or API
call each commit happened in. State commits and each kind of effect commit are marked
differently.

Calls between the modules show as links between commits in a group, worked out from which module
each state commit changed. This takes no stored data.

## Acceptance criteria

- Each timeline has its own column; a fork's column starts at its fork point, joined to its
  parent's commit, and a commit shared by timelines shows once.
- By time, commits at the same simulated time sit in the same band in every column; by commit
  number, row n holds commit n of every column; a person switches between the two.
- Groups nest, and open and close at any level across every column at once.
- Every commit is selectable at some zoom level, and a commit expands to its events.
- Rule functions know nothing about groups.

## Dependencies

- [I03-E02-005 — Direct effect commits and their groups](I03-E02-005-direct-effect-commits-and-their-groups.md)
- [I03-E02-012 — Forks and named timelines](I03-E02-012-forks-and-named-timelines.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Project foundation: FND-87](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)
- [Run history: Timeline](../../../../../../../../../design/modules/run-history.md#timeline)
- [UI section](../../../../../../../../../design/ui/README.md)

## Internal phases

The user approved the plan below on 2026-11-07.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-014-P05` | Forks renamed branches | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-014-P01` | The grid of branches and commits, worked out | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-014-P02` | The watched run shows any commit of any branch | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-014-P03` | The timeline panel in place of the event list | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-014-P04` | Links between modules, and the pages | Done | 2026-11-08 | Approved; Implemented |

### Plan

The user chose the columns, the two row modes, where shared commits show, how groups open, where
the view goes, and that a commit expands to its events (FND-87). After each phase,
`npm run check` passes and the pinned digests hold. P05 comes first, so the new view is built
with the new names.

1. **P05, branches:** each fork is a branch, in the UI, the pages, and the code: `TimelineId`
   becomes `BranchId`, `run-timelines` becomes `run-branches`, and so on. A saved run keeps
   reading, as the repository maps the stored names.
2. **P01, the grid:** plain, tested functions work out, from every branch's commits, the
   columns in the tree's order, each column's own commits after its fork point, the line joining
   each fork to its parent's commit, the rows in each mode, and the groups, with which are open.
   Nothing new is saved.
3. **P02, the watched run:** its status gives every branch's commits, kept as the run's history
   already holds them, and it can show any commit of any branch, watching that branch first.
4. **P03, the browser:** the timeline panel takes the event list's place: a column per branch,
   the row-mode switch, groups that open and close, a commit that expands to its events, marks
   for each kind of commit, later commits dimmed, following the newest commit, and scrolling that
   stays fast at a city day's size. Selecting a commit or an event shows it, and its payload in
   the detail panel. Each column's heading carries its branch's name, where it forked, the fork
   icon, and Rename, and the Branches tab, called Timelines before P05, goes.
5. **P04, links and pages:** calls between modules as links between commits in a group, the Run
   history and UI pages, and the end-to-end tests moved from the event list.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-05 — Moved from Proposed to Ready: its dependency I03-E02-005 is Done.
- 2026-11-08 — P04 Done: each state commit shows the module it changed, worked out from its root
  against the one before; an arrow joins two commits of one job run or API call that changed
  different modules; a closed job run or API call shows its path through the modules, and a
  closed hour or minute how many calls it holds. The Run history and UI pages describe the
  timeline as built, and the end-to-end tests moved to it in P03. `npm run check` passes.
- 2026-11-08 — Done: every acceptance criterion is met. Each branch has its own column, a fork's
  starting at its fork point and joined to its parent's commit, and a shared commit shows once;
  rows line up by time or by number, switched between; groups nest and open and close at any
  level across every column; every commit is selectable and opens to its events; and rule
  functions know nothing about groups. The item moved to the Done archive.
- 2026-11-08 — Fixed after the user's review of screenshots (FND-87): module badges and call
  arrows moved left of the lane, so commit text keeps its room; changing the zoom or the rows'
  mode applies as chosen even with an event selected; a fork's connector row goes above a closed
  group that also holds its own commits; and narrower columns fit four branches in a usual
  window. `npm run check` passes.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
- 2026-11-07 — Rescoped and planned: the user said that "the timeline branch should show every dag
  root as a sequence of events", and chose a column per branch, rows by time or by commit
  number, shared commits shown once, groups that open across every column, a commit that expands
  to its events, and that the view replaces the event list (FND-87). The plan waits for the
  user's review.
- 2026-11-07 — Plan revised: the user chose groups by job run and API call, that selecting a
  commit watches its branch, that the view follows the newest commit, that forks are renamed
  branches, and that the Timelines tab goes (FND-87). P05 renames forks to branches first. The
  plan waits for the user's review.
- 2026-11-07 — In Progress: the user approved the plan. P05 started. The engine's own line of
  commits, `ITimeline`, becomes `ICommitLine`, so timeline names neither a fork nor that line,
  and the panel at the bottom of the run workspace keeps the name timeline, as it becomes the
  Timeline view.
- 2026-11-07 — P05 Done: forks are branches in the UI, the pages, and the code (`BranchId`,
  `MAIN_BRANCH`, `IBranch`, `run-branches.ts`, `branch-id.ts`, the Branches tab), and the
  engine's line of commits is `ICommitLine` in `commit-line.ts`, held as a run's `line`. A saved
  run still stores its branches as `timelines`, so saved runs read as before. `npm run check`
  passes. The user chose that by commit number each branch's nth job run or API call sits on
  the same rows, and that hours and minutes group the job runs and API calls (FND-87).
- 2026-11-07 — P01 started. The user chose that by commit number, hundreds and then tens of job
  runs and API calls group them, as hours and minutes line up only by time (FND-87).
- 2026-11-07 — P01 Done: `src/ui/run-history/timeline-grid.ts` works out the columns in the
  tree's order, each fork's join to the column holding its last shared commit, the groups by
  time or by number with a span holding one thing skipped, the rows given which nodes are open,
  and the keys of the groups down to a commit. A fork that changed nothing lines up with Main
  row for row in both modes.
- 2026-11-07 — P02 Done: `branchLinesOf` gives every branch with its whole line; the live run
  keeps them for the state they came from, the watched run's status lists them, and
  `showCommit` shows a commit of any branch, watching that branch first. Two column tests
  measured an inspector table in the instant it changed, and now wait for it to be laid out.
  `npm run check` passes. P03 started.
- 2026-11-07 — P03 Done: the timeline panel replaced the event list at the bottom of the run
  workspace, with a column per branch headed by its name, origin, fork icon, and Rename, rows by
  time or by number, groups that open while they hold the commit shown, commits that open to
  their events, and following. The Branches tab went. The event list conflicted with FND-77, so
  the user chose to keep it as an Events tab in the main area. Lines and the grid now grow with
  the run instead of being worked out again: on a run of 74,624 commits, taking in each tick's
  new commits and drawing the rows takes under a millisecond. The end-to-end tests moved to the
  timeline, and `npm run check` passes. Following scrolls up as well as down, as the commit
  shown can move back, so only scrolling up past where following left the list stops it.
- 2026-11-07 — Reworked after the user's review (FND-87): each branch's column has its own
  coloured lane, Main's from the top and a fork's from its fork point, where a line in the
  fork's colour leaves the parent's commit along the bottom of its row, crosses any columns
  between, and meets the fork's lane; commits sit on their lane. A group's whole row opens it, a
  commit's whole label opens its events, rows are taller, commits and events look choosable, and
  hovering keeps the colours of the commit shown and the event selected. `npm run check` passes.
- 2026-11-07 — Laid out as a tree, as the user asked (FND-87): each branch's column sits between
  its forks, which alternate sides in the order they were made, the first to the right; a fork's
  line leaves its parent towards its side; each lane runs down the middle of its column; and a
  branch keeps its colour, from the order it was made, from five lane colours of its own.
  `npm run check` passes but for one WebKit run of an inspector test, which passed 32 times
  out of 32 when run again.
- 2026-11-07 — Reworked after the user's review (FND-87): only the rows scroll, both ways, so the
  vertical scroll bar stays at the panel's edge and the time and group column stays put, with
  the headings moving sideways in line. Commits are nodes labelled as roots of the DAG and groups
  shaded bands; the commit ending each job run or API call, or made outside one, is a fork
  point, ringed, with a fork icon that starts a branch after it, in place of the headings' fork
  icons, which went; renaming is a pencil icon. `npm run check` passes.
- 2026-11-07 — Zooming, as the user asked (FND-87): a closed group draws a summary node with its
  count on each lane it holds commits of, filled when it holds the commit shown, and a zoom
  switch, Hours, Minutes, or Commits by time and Hundreds, Tens, or Commits by number, sets which
  groups start open, starting with Minutes. Following finds the summary node holding the commit
  shown when zoomed out. `npm run check` passes.
- 2026-11-07 — The user pointed out that clicking a summary node did not open its group: the
  layer meant to make a group's whole row a target covered only the label once that column
  stayed put. Each summary node is now a button over its whole cell that opens and closes its
  group, with a tooltip saying which, and a test clicks it both ways. `npm run check` passes.
- 2026-11-07 — Curves and headings, as the user asked (FND-87): a whole heading watches its
  branch; each fork has a connector row below the row holding its parent's commit, where its
  line curves off the parent's lane, crosses any columns between, and curves down into its lane,
  so curves never overlap text or each other, and rows keep the one height the scrolling needs.
  `npm run check` passes but for one Firefox run, where closing the browser failed; the
  timeline tests passed 51 times out of 51 in Firefox when run again.
- 2026-11-08 — P04 started: the user chose module badges on state commits, arrows between
  commits of one job run or API call that changed different modules, and the path of modules on
  a closed job run or API call (FND-87).
