# Verification

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a module in
  [FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries). Partly implemented: the
  Invariant checker, on four criteria, the Simulator self-tests, and judging a scenario's run. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds the rest.

## Current and approved responsibilities

Checks runs against the correctness criteria and invariants, proves rules for small setups with
the model checker, and measures coverage. Its capabilities are listed in
[capability ownership](capability-ownership.md).

## Key approved business rules

- The criteria: [FND-29](../decisions/project-foundation.md#fnd-29--business-correctness) and
  [FND-30](../decisions/project-foundation.md#fnd-30--technical-correctness).
- Pass and fail, and the targets and limits:
  [FND-49](../decisions/project-foundation.md#fnd-49--scenarios) and
  [FND-50](../decisions/project-foundation.md#fnd-50--targets-and-limits).
- The drift report: [FND-47](../decisions/project-foundation.md#fnd-47--failures).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Scenarios](scenarios.md) (runs to check), [Event log](event-log.md) (run records),
  [Versions](versions.md) (the rules checked), [Business rules](business-rules.md)
  (criteria), [Run history](run-history.md) (saved runs to rerun), and
  [Simulation engine](simulation-engine.md) (run records: the typed log entry kinds,
  [FND-82](../decisions/project-foundation.md#fnd-82--application-core-layer)),
  [Orders](orders.md) (order states and event kinds), and [Drivers](drivers.md) (event
  kinds), so a run's record is typed
  ([FND-72](../decisions/project-foundation.md#fnd-72--code-style)).
- **Used by:** no other module.

## How the first criteria are judged

The checker reads a run from its event log alone
([FND-75](../decisions/project-foundation.md#fnd-75--first-criteria-as-judged)), when the run has
ended, and links each violation to the log entry that shows it. Application.Core reads the run's
record from its typed log entries, and Domain judges that record:

| Criterion | A run breaks it when |
| --- | --- |
| Valid final state | An order's latest status is not `Delivered`, `OrderReturned`, or `Cancelled` |
| Modules agree | An outbox event is unread at the end, or one module has an event kind for an order that the other lacks, or they name different drivers, or deliveries' copy of an order is behind |
| Exactly-once effect | An outbox event is not read by the other module exactly once, or a read has no such event, or two events in a module match one in the other, or an event is recorded twice |
| Outbox for every event | An event has no outbox event or more than one, or an outbox event has no event. A delivery request that deliveries has not acknowledged has none yet, which is allowed |

`npm run self-test` runs the Simulator self-tests. They take a known good run, confirm it passes,
and then break its log in each of these ways, to prove the checks can fail.

## Snapshot tests

Approved in
[FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions),
and not built yet. A snapshot test reruns a saved run statelessly and compares it with the run's
stored states, in two ways:

- **With the run's own function versions**, which shows that recalculating is exact. Each
  rebuilt root is compared with the stored root, or, for a run saved at "minimum", with the
  digest kept for it.
- **With the newest versions**, which shows the first commit a breaking change affects. Each
  stored call runs again with the newest version of its function, on the recalculated root before
  it, and the first commit whose result differs is reported. Stored calls after it may no longer
  match what the new version would really do. Where the run switched a function's version, the
  switched version is used from then on, as recorded.

They run in two places: as automated tests, which `npm run check` runs over saved runs kept in
the repository, and as a Snapshot test action on a saved run in the app. The repository keeps one
saved run for each built-in scenario, at the minimum level, made again only when a new function
version is added.
I03-E02-009
builds them.

## Code map

| Path | Purpose |
| --- | --- |
| `src/domain/verification/check-run.ts`, `criterion.ts` | Judges a run's record on the criteria |
| `src/domain/verification/run-record.ts` | What a run did, as its event log shows it |
| `src/application-core/verification/read-run-record.ts`, `check-run.ts` | Reads a run's record from its typed log entries, and judges a run from its log |
| `src/domain/verification/valid-final-state.ts`, `modules-agree.ts`, `exactly-once-effect.ts`, `outbox-for-every-event.ts` | The criteria |
| `src/application/verification/check-scenario.ts` | Runs a scenario, and judges the run |
| `src/application/verification/self-tests.ts`, `src/application/scenarios/self-test-case.ts` | The Simulator self-tests, and the known case they break, which is a scenario and so lives with the scenarios |
| `scripts/self-test.mjs` | Runs them from the command line |
| `src/application/verification/watched-run.ts`, `run-session.ts` | The services behind a run watched in the browser: it is judged when it ends |
