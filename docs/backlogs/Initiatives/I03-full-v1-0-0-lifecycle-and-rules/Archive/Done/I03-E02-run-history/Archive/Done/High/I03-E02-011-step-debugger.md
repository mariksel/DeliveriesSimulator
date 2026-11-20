# I03-E02-011 — Step debugger

| Field | Value |
| --- | --- |
| ID | `I03-E02-011` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | 2026-11-08 |

## Scope

Step debugger: set breakpoints on events, and pause the run there. Rescoped on 2026-11-08
([FND-88](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-88--step-debugger)): breakpoints on rules need the record of each rule's evaluation that the
[Rule evaluation log](../../../../../../I03-E04-business-rules/High/I03-E04-007-rule-evaluation-log.md)
makes, so they come with it.

A breakpoint matches an event kind, narrowed if wanted to one source module or one order, and can
be switched off without being removed. A Breakpoints tab lists them, and each event in the Events
tab and on the timeline can set one for its kind. A hit pauses the run after the job run or API
call that wrote the event, shows the commit that wrote it, selects the event, and says which
breakpoint it hit; Resume goes on to the next hit.

## Acceptance criteria

- A run pauses at a breakpoint on an event, and can continue from there.
- A paused run can be inspected through the existing views.

## Dependencies

- [I03-E02-010 — Time-travel replay](I03-E02-010-time-travel-replay.md)

## Sources and evidence

- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)
- [Project foundation: FND-34](../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)
- [Project foundation: FND-88](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-88--step-debugger)

## Internal phases

The user approved the plan below on 2026-11-08.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-011-P01` | Breakpoints and what they match, in the core | Done | 2026-11-08 | Approved; Implemented |
| `I03-E02-011-P02` | The run pauses at a hit, and goes on | Done | 2026-11-08 | Approved; Implemented |
| `I03-E02-011-P03` | The Breakpoints tab, and setting one from an event | Done | 2026-11-08 | Approved; Implemented |

### Plan

The user chose what a breakpoint matches, where breakpoints are set, and what a hit shows
(FND-88). After each phase, `npm run check` passes and the pinned digests hold.

1. **P01, the core:** a breakpoint holds an event kind, an optional source module and order, and
   whether it is on. A plain, tested function says which breakpoint, if any, the entries a piece
   of work wrote hit. Working out an entry's order moves from the event list's views into the
   core, so both use it. Nothing is saved with the run.
2. **P02, the run:** the live run runs work one piece at a time while any breakpoint is on, and
   checks each piece's new entries. On a hit it pauses, keeps the clock in step, shows the
   commit that wrote the event, and keeps the hit; Resume and Step go on as now. The watched run
   lists the breakpoints, adds, switches, and removes them, and says what the last hit was.
3. **P03, the browser:** a Breakpoints tab lists the breakpoints, each with a switch and a remove
   icon, and adds one from a kind, offered from the kinds the log holds, an optional source, and
   an optional order. Each event in the Events tab and on the timeline has a pause on this kind
   icon. A hit selects the event and says which breakpoint it hit. The Simulation engine and UI
   pages and the end-to-end tests follow.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-07 — Moved from Proposed to Ready: its dependency I03-E02-010 is Done.
- 2026-11-08 — Rescoped and planned: the user chose that breakpoints on events come now and on
  rules with the Rule evaluation log, what a breakpoint matches, where breakpoints are set, and
  what a hit shows (FND-88). The plan waits for the user's review.
- 2026-11-08 — In Progress: the user approved the plan. P01 started.
- 2026-11-08 — P01 Done: a breakpoint holds an event kind, an optional source and order, and
  whether it is on; `breakpointHit` says which breakpoint, if any, a piece of work's entries
  reach. Working out an entry's order moved into the core, which the event list and inspector
  now use.
- 2026-11-08 — P02 Done: the work checks each piece's new entries while a breakpoint is on, and
  stops after the one that reaches it, at max speed and when catching up on time alike; the
  clock halts where the work did; the run shows the commit that wrote the event and keeps the
  hit; Resume and Step go on from the latest commit. The watched run lists, adds, switches, and
  removes breakpoints and gives the last hit. `npm run check` passes but for one WebKit run of
  an Events tab test, which passed 30 times out of 30 when run again. P03 started.
- 2026-11-08 — P03 Done: a Breakpoints tab lists the breakpoints, each with a switch and a remove
  icon, adds one by kind, offered from the log's kinds, source, and order, and says which one
  the run stopped at; each event in the Events tab and on the timeline has a dot that pauses the
  run at its kind, or stops doing so; a hit selects its event, and Step stays enabled there as
  Resume does. Breakpoints are kept when the run starts again. The Simulation engine, Technical
  view, and UI pages and FND-88 describe it as built. `npm run check` passes.
- 2026-11-08 — Done: every acceptance criterion is met. A run pauses at a breakpoint on an event and
  can go on from there, and a paused run can be inspected through the existing views, which show
  the commit that wrote the event. The item moved to the Done archive.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
