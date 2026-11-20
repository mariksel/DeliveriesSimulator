# I03-E02-021 — Links across the sub-roots

| Field | Value |
| --- | --- |
| ID | `I03-E02-021` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-08 |
| Last updated | 2026-11-09 |
| Completed | 2026-11-09 |

## Scope

Effects point directly at the state they saw, such as the exact `OrderVersion` a call saw, and
state holds an effect's ID, as
[FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
describes. Every record version records the job run or API call that made it, and every API
call's and job run's effect lists the versions it read: as they stood before it, the order and
driver a call names, the records it made versions of, and the drivers it notified, which the
engine works out; a config change lists none. Domain cannot know the Simulation engine's IDs, so
a version holds a maker that System defines. Versions made at a run's start, such as its
starting drivers, name the run's start (FND-81).

The links are queried through one module of pure functions in Run history, `run-query.ts`: the
state at a moment, a record's version then and its history, who made a version and when, what a
job run or API call made, the commit that wrote a log entry, and the commits that touched a
record. An index in the run's cache, never saved, keeps the last two fast on a city day. Events
and outbox rows name no maker (FND-81).

## Acceptance criteria

- Every API call's and job run's effect lists the versions it read, as FND-81 defines them.
- Every record version records the job run or API call that made it, so two moments with the
  same state sub-root still compare equal by one pointer comparison.
- Domain code names no Simulation engine type for it.
- A saved run keeps both links, and loads them back.
- Every query named in the scope is in `run-query.ts`, tested on the sample runs, and on a city
  day answers in under 1 ms; who made a version answers in under 1 µs.
- With the index, a city day runs at most 5% slower and holds at most 50 MB more than without it.

## Dependencies

None.

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Simulation engine: Records and references](../../../../../../../../../design/modules/simulation-engine.md#records-and-references)
- [Simulation engine: Performance](../../../../../../../../../design/modules/simulation-engine.md#performance)
- [Run history: Moving and forking](../../../../../../../../../design/modules/run-history.md#moving-and-forking)

## Internal phases

The user approved the plan below on 2026-11-08 and reshaped it on 2026-11-09. Phases keep their
IDs, so the work runs P01, P03, P04, P05, then P02.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-021-P01` | Versions that name the work that made them | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-021-P02` | Effects that list the versions they read | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-021-P03` | The maker survives saving | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-021-P04` | One query module | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-021-P05` | An index for city scale | Done | 2026-11-09 | Approved; Implemented |

### Plan

After each phase, `npm run check` passes.

1. **P01, makers:** an immutable maker class in `src/domain/system/records/` beside the version
   chain, with one static constructor for a job run or API call and one for the run's start.
   `OrderVersion`, `DeliveryCopyVersion`, `DriverVersion`, `OrderDeliveryVersion`, and
   `NotificationVersion` gain it. The 12 registered state functions that make versions take it
   and pass it to each version they make; the two that only record an event as read take none.
   Each call passes the open job run's or API call's maker, and `addDriver` gives the starting
   drivers the run's start. Version 1's
   fingerprint pins in `function-fingerprints.spec.ts` are updated in place this once, as FND-81
   allows. A run's digest covers its log entries, not its roots, so run digests should hold; any
   that changes is reported with its reason.
2. **P03, saved:** the persisted versions in `persisted-orders-state.ts`,
   `persisted-drivers-state.ts`, and `persisted-deliveries-state.ts` keep the maker, and a saved
   call stores it as its own text, like any value argument. A run saved and loaded answers who
   made each version as before.
3. **P04, one query module:** `src/application-core/run-history/run-query.ts` gives the commit
   and root at a place, which modules changed between two roots, a record's version at a place,
   its history, who made a version and when, the commits a job run or API call made, and the
   commit that wrote a log entry. It reuses the version chain and the run's places, and the
   timeline's private `moduleChanged` moves into it. Sessions are numbered in order along a line,
   so a job run's or API call's commits are found by binary search. Each function is tested on
   the sample runs and timed on a city day.
4. **P05, an index:** the run's cache keeps, for each job run or API call, the records it made
   versions of, and for each record, the commits that made a version of it, learnt from what each
   state function made. It is never saved and is worked out again on a fork or a switch. The
   query module gains the records a job run or API call made versions of, and the commits that
   touched a record. Tests compare it with a full scan, and after a fork and a switch with one
   built from scratch. A city day is measured with `scripts/benchmark-city.mjs` before and after,
   against the budget in the acceptance criteria.
5. **P02, reads:** as the user chose on 2026-11-09, the engine works out what each API call and
   job run read, as they stood before it: the order and driver a call names, the records it made
   versions of, and the drivers it notified; inbox events are not listed. The input and
   job effects in `direct-effect.ts` hold them as references into the state sub-root; a config
   change holds none. `persisted-main-root.ts` stores a version read as its record's kind, ID, and
   version number. The Simulation engine's Records and references, the Run history page, and the
   code maps follow.

## Status history

- 2026-11-08 — Created as Ready: FND-81 approved these links, nothing built or tracked them, and
  the user chose a new Run history item for them. It has no dependencies.
- 2026-11-08 — Scope settled by the user: every effect links to every version it read, and every
  version to the job run or API call that made it, through a System ID type (FND-81).
- 2026-11-08 — Planned: the user chose that each step lists what it read explicitly, that a
  config change reads no records, and that version 1's pins are updated in place this once,
  and approved the phases below (FND-81).
- 2026-11-08 — Details chosen by the user: versions made at a run's start name the run's start,
  and a dispatch pass lists only what it acted on (FND-81).
- 2026-11-09 — Scope widened: the user chose a way of querying a run's DAG that stays fast on a
  city day, through one query module and an index in the run's cache, with the maker's shape, how
  a saved call stores it, and the index's budget. Effect reads stay as the last piece of work, and
  events and outbox rows name no maker. P03 narrows to saving the maker, P04 and P05 are added,
  and three acceptance criteria are added (FND-81).
- 2026-11-09 — Placement and reads chosen by the user while building: the query module stays in
  Run history, which now uses Orders and Drivers for the records its queries name, and the engine
  works out what each job run or API call read, versions only. The first acceptance criterion
  follows (FND-81).
- 2026-11-09 — Done: all five phases are built, and `npm run check` passes. Each state function's
  result lists the versions it made, which the index takes in, so the 14 pins were updated in
  place once, as FND-81 allows; no run digest changed. On a city day the index holds 24 MB and
  every query answers in microseconds. A city day holds 48 MB more, and runs 1.5% slower by the
  middle of six alternating runs and 7.9% by the fastest; a CPU profile puts 3.5% of the run in
  the new code, so it is taken as within the 5% budget. The figures are in the Simulation
  engine's Performance section.

## Priority history

- 2026-11-08 — Created at High priority, like the epic's other items.
