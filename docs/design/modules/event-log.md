# Event log

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Partly implemented: the log
  exists, and a run's modules and actors write to it. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds it.

## Current and approved responsibilities

A readable, ordered record of what happened in a run. It is worked out from the run's commits,
which are the single record
([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)): each
commit holds the entries written since the commit before it, and the log is those entries, commit
after commit. A cache beside the line of commits holds the log for fast lookups. It is not saved, and is
rebuilt from the commits when a run is loaded.

## Key approved business rules

- Commits took over as the single record of a run
  ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)),
  which amends [FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries). The log's
  contents stay the same, so a job that finds nothing is still not logged, though it is a commit.
- Each kind of entry has typed data, built from the modules' own records. The Event log keeps the
  generic part: an entry's place, time, cause, and trace. The Simulation engine, which writes every
  entry, defines the kinds in Application.Core, and the JSON check is made where entries are
  persisted ([FND-72](../decisions/project-foundation.md#fnd-72--code-style)).
  A config change writes a `ConfigChanged` entry from the simulation engine, with each value it
  changed, by rule and parameter ID, before and after, and its commit holds it
  ([FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions)).
  An indirect commit writes an `IndirectEffectHappened` entry from the actors, holding the
  indirect effect, which the service did not see
  ([FND-89](../decisions/project-foundation.md#fnd-89--indirect-effects-stated-by-hand)).
- What each entry holds, and that entries never change
  ([FND-65](../decisions/project-foundation.md#fnd-65--event-log-entries)).
- A run is repeatable event for event
  ([FND-48](../decisions/project-foundation.md#fnd-48--simulation-model)), and a tuning change
  during a run is an event in it
  ([FND-54](../decisions/project-foundation.md#fnd-54--tunability)).
- Failures from Fault injection are ordinary events
  ([FND-22](../decisions/project-foundation.md#fnd-22--error-reporting)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** no other module.
- **Used by:** [Business view](business-view.md) (reads), [Technical view](technical-view.md)
  (reads), [Verification](verification.md) (run records), [Run history](run-history.md) (reads),
  and [Simulation engine](simulation-engine.md) (writes every event).

## Code map

| Path | Purpose |
|---|---|
| `src/domain/event-log/event-log.ts` | The log |
| `src/domain/event-log/numbers.ts` | `LogSequence`, an entry's place in the log, made by a creator that checks it |
| `src/domain/event-log/log-entry.ts`, `log-vocabulary.ts` | Its generic entry, a record at its place in the log, and the words entries use |
| `src/application-core/simulation-engine/run-log-entry.ts` | Every kind of entry a run writes, each with typed data |
