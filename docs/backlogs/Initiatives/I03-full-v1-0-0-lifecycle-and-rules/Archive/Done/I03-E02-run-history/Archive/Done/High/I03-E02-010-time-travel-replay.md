# I03-E02-010 — Time-travel replay

| Field | Value |
| --- | --- |
| ID | `I03-E02-010` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-07 |
| Completed | 2026-11-07 |

## Scope

Time-travel replay: step forwards and backwards through a run by moving between existing
commits, and repeat it exactly from any point. Going forward uses a lookup from parent to
children, which can be rebuilt and isn't saved.

## Acceptance criteria

- Moving to any commit shows that commit's state at once, without recalculating.
- Repeating a run from a commit gives the same result.

## Dependencies

- [I03-E02-003 — Commits and the main root](I03-E02-003-commits-and-the-main-root.md)

## Sources and evidence

- [Project foundation: FND-86](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-86--time-travel-replay)
- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)
- [Project foundation: FND-34](../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)

## Internal phases

The user approved the plan below on 2026-11-07.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-010-P01` | Moving between commits, and repeating from one, in the core | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-010-P02` | The watched run moves, and repeats from where it is | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-010-P03` | Back, Forward, the slider, and Repeat from here | Done | 2026-11-07 | Approved; Implemented |

### Plan

The user chose how a person moves, by how much, what running does while back, and how repeating
is offered (FND-86). After each phase, `npm run check` passes and the pinned digests hold.

1. **P01, the core:** a run's commits in order, each with its place, and the number of log
   entries written up to it, kept as the run grows, so going to any commit, or any place on the
   slider, takes the commit's root at once and the log up to it, without recalculating. The
   commit before and after one, and the first and last commit of its job run or API call. The
   commit that wrote a log entry. Repeating from a commit: the run cut back to that commit, with
   its cache worked out again from the commits, runs on to the latest commit's time, and the
   repeat is compared with the original commit by commit: kind, time, job run or API call, and
   log entries; the result names the first commit that differs, if any.
2. **P02, the watched run:** the run being watched keeps which commit is shown, latest by
   default, and moves Back, Forward, to a place, to the commit of an entry, and to the latest,
   by one commit or one job run or API call. Its status gives the commit shown, its place among
   all of them, its time, the log up to it, and its state, so every view shows that commit.
   Start and Step are disabled until the latest is shown. Repeat from here runs the repeat and
   gives its result.
3. **P03, the browser:** Back and Forward beside Step, the step-size toggle, the slider, Latest,
   and Repeat from here with its result; the status bar says "Commit n of m" while an earlier one
   is shown; selecting an event moves to its commit. The UI pages and end-to-end tests follow.

### Decisions on the plan

The user chose these on 2026-11-07
([FND-86](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-86--time-travel-replay)):

- **Selecting an event:** it opens the event's detail and moves the run to its commit.
- **Repeat at city size:** repeating most of a city day keeps the page busy for about as long as
  the day takes to run, which is acceptable for now.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-05 — Moved from Proposed to Ready: its dependency I03-E02-003 is Done.
- 2026-11-07 — Planned: the user chose the controls, the step size, running while back, and the
  repeat action (FND-86). The plan waits for the user's review.
- 2026-11-07 — In Progress: the user approved the plan, and chose that selecting an event moves to
  its commit and that a long repeat is acceptable for now (FND-86).
- 2026-11-07 — P01 Done: the run's cache keeps every commit's ID in order and how many log entries the
  commits hold up to each, so a place, from 0 at the start to the latest, gives its commit, root,
  and log at once (`run-places.ts`). The commit that wrote an entry is found by halving, and Back
  and Forward by job run or API call find the nearest place between groups. `run-repeat.ts`
  cuts a run back to a place between groups, works its cache out again, runs it on to the
  latest place, making config changes made by hand again from their log entries, and compares
  each commit's ID, kind, time, group, and entries, naming the first that differs. npm run check
  passes.
- 2026-11-07 — P02 Done: the live run keeps the place shown, latest by default, and moves Back and Forward by a commit or a job run or API call, to a place, to the commit of an entry, and to the latest; showing an earlier place pauses a running run, and Start and Step wait for the latest. The watched run's status gives the place, the latest place, the log, time, orders, and rules as they stood, and the last repeat's result, which a move forgets; the verdict and digest stay the whole run's. npm run check passes.
- 2026-11-07 — P03 Done: Back and Forward beside Step, a Commit or Job run or call toggle, a slider over the commits, Latest, and Repeat from here with its result sit in the run controls, and the status bar says "Commit n of m" while an earlier commit is shown. Selecting an event moves to its commit; the event list and the trace keep the whole log, with later events dimmed. End-to-end tests cover each control. npm run check passes, and the city day's digest is unchanged.
- 2026-11-07 — Done: every acceptance criterion is met. Going to any commit shows its state at once,
  and repeating from a commit gives the same commits and log entries. The item moved to the
  Done archive.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
