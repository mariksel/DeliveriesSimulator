# I03-E02-012 — Forks and named timelines

| Field | Value |
| --- | --- |
| ID | `I03-E02-012` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-07 |
| Completed | 2026-11-07 |

## Scope

Snapshot and branch: go back to any commit and act by hand, state an indirect effect, or change
a value, and a new timeline starts, sharing everything before the fork. There is no merging.
Timelines can be named, and a run that has ended can be forked. This capability moves here from
`I04`.

## Acceptance criteria

- Two timelines share all nodes before their fork, and neither changes the other.
- A fork can start from any commit, including one in a finished run.
- The timeline tree shows each timeline and where it forked.

## Dependencies

- [I03-E02-010 — Time-travel replay](I03-E02-010-time-travel-replay.md)

## Sources and evidence

- [Project foundation: FND-87](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)
- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)
- [Implementation roadmap](../../../../../../../../../design/roadmap/implementation-roadmap.md)

## Internal phases

The user approved the plan below on 2026-11-07.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-012-P01` | A run as a tree of timelines, in the core | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-012-P02` | Saved runs and verdicts for every timeline | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-012-P03` | The watched run forks, switches, and renames | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-012-P04` | The Timelines tab and Fork here | Done | 2026-11-07 | Approved; Implemented |

### Plan

The user chose what forks, where the tree shows, how timelines are named, and that each is
judged on its own (FND-87). After each phase, `npm run check` passes and the pinned digests
hold.

1. **P01, the core:** a run's history holds every commit of every timeline in one store, so
   timelines share every commit before their fork, and a list of timelines, each with its ID,
   name, head, and the commit and timeline it forked from. The run's current timeline stays the
   line of commits the engine works on today, so the engine is unchanged. Forking at a place
   starts a new timeline there and makes it current; switching makes another current and works
   its cache out again from its commits; renaming changes a name. Commit and session numbers
   count along each timeline's line of commits, so a fork goes on from its fork point, and a
   timeline's ID with a commit's ID names the commit across the run.
2. **P02, saved runs and verdicts:** a persisted run holds every timeline and every commit once,
   and loads back exactly. The digest and the verdict are the current timeline's.
3. **P03, the watched run:** changing a rule while an earlier commit is shown forks there first;
   Fork here forks with no change; Start and Step run a fork on from its head. The watched run
   switches and renames timelines, keeps each timeline's verdict, and its status lists the
   timelines with their fork points.
4. **P04, the browser:** the Timelines tab with the tree, switching, and renaming, and a Fork here
   button in the run controls. The UI pages and end-to-end tests follow.

### Decisions on the plan

The user chose these on 2026-11-07
([FND-87](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)):

- **IDs:** a timeline's ID with a commit's ID is unique across the run, and commit and session
  numbers count along each line of commits, so a repeat still matches by ID and group.
- **Removing timelines:** not in this item.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-07 — Moved from Proposed to Ready: its dependency I03-E02-010 is Done.
- 2026-11-07 — Planned: the user chose what forks, where the tree shows, how timelines are named, and
  that each is judged on its own (FND-87). The plan waits for the user's review.
- 2026-11-07 — In Progress: the user approved the plan, chose that a timeline's ID with a commit's ID
  is unique across the run, and left removing timelines for later (FND-87). P01 started.
- 2026-11-07 — P01 Done: a run's history lists its timelines with their names and fork points, and keeps each timeline's own commits after its fork, while the engine works on the current line of commits as before. `forkAt` starts a timeline between job runs and API calls at or before the place asked, `switchTo` makes another current and works its cache out again, and `rename` changes a name. Commit and session numbers count along each line, so a fork numbers on from its fork point. npm run check passes.
- 2026-11-07 — P02 Done: a persisted run holds every timeline with its name, fork point, and own commits, so each commit is kept once, and loads back exactly on a fork and back on Main. The current timeline's own commits live only in the run's line of commits. The digest and the verdict are the current timeline's, as the log is. npm run check passes.
- 2026-11-07 — P03 Done: the live run forks at the place shown, forks first when a rule changes while an earlier commit is shown, switches to another timeline, and renames one, going on paused at the new line's latest commit. `SimulationRun.continueFrom` takes another line of commits. The watched run keeps a verdict for each timeline, and its status lists the timelines and the one watched. npm run check passes.
- 2026-11-07 — P04 Done: a Fork here button sits in the run controls, and a Timelines tab beside Rules shows each timeline under the one it forked from, with where it forked and its commits, to watch or rename. End-to-end tests fork, run a fork to its own verdict, switch back to Main's, and rename. npm run check passes.
- 2026-11-07 — Done: every acceptance criterion is met. Two timelines share every commit before their
  fork, and neither changes the other; a fork can start from any commit, a finished run's
  included; and the Timelines tab shows each timeline and where it forked. The item moved to the
  Done archive.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
