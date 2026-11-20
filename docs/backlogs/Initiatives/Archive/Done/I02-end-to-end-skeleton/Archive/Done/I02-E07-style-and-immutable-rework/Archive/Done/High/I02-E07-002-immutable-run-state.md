# I02-E07-002 — Immutable run state

| Field | Value |
| --- | --- |
| ID | `I02-E07-002` |
| Parent | [I02-E07 — Style and immutable rework](../../../I02-E07-style-and-immutable-rework-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-04 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

Moves the core to the immutable design: a run's state as one value, modules as state types and
pure functions, commands as plain function calls, effects as data, scheduled work as data, random
state in the run's state, the event log as an immutable list, and Immutable.js collections.

### Outcome

- A run's whole state is one value, `IRunState`, and each step is a pure function to the next one.
  Orders and deliveries moved to Domain as state types and pure functions, with Immutable.js
  collections. No module calls another: a step returns its reports and effects, and the engine
  carries them out.
- The user decided on 2026-11-04 that Application does the orchestration and may hold mutable
  services. `SimulationRun` holds the latest state, and `SimulationClock` drives it. Both are
  recorded in FND-73.
- Scheduled work is records, each random stream's position is in the state, and a run's state
  converts to plain JSON and back. A run saved halfway and loaded goes on to the same end as one
  never saved.
- A bug inside a run stops it and says where, and the last good state remains. The browser shows
  this, and the command line exits with code 1.
- The user also decided that anything external stays in Infrastructure. Reading a chosen file moved
  from the panel to `BrowserScenarioFiles`, behind `ScenarioFiles`. The scenario reader is now pure
  functions, which validate text that has already been read.
- The scenario's digest stayed `824be9ddc2eee257`, so the log is byte for byte what it was.
- `npm run check` passes, with 552 unit and component tests and 9 end-to-end tests. Each new lint
  rule was tested by breaking it on purpose.
- Stryker scored 94.80% before the last tests were added, down from 97.65%. Its uncaught mutants
  were read: about 10 were real gaps, now closed with tests or by removing dead code, and the rest
  are message wording or have no effect on behaviour. It was not run again, so the score after
  those tests is not measured.
- One end-to-end test failed now and then in Firefox, because the browser could not reach
  `localhost`. Pinning the test server to `127.0.0.1` gave 6 clean runs out of 6.

## Acceptance criteria

- Each step of a run is a pure function from state to new state, events, and effects.
- No module calls another: the engine carries out the effects.
- A run's state converts to plain JSON and back exactly.
- `npm run check` passes, with the immutability rules on, and the scenario's digest is
  unchanged, or any change is explained.

## Dependencies

- [I02-E07-001 — Apply the code style rules](I02-E07-001-apply-the-code-style-rules.md)

## Sources and evidence

- [Project foundation: FND-73](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-73--immutable-architecture)
- [Layers](../../../../../../../../../../../design/architecture/layers.md#immutability)
- [Code style](../../../../../../../../../../../design/governance/code-style.md#immutability)

## Status history

- 2026-11-04 — Created as Proposed, on the user's decision. It starts when its dependencies are
  Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E07-001, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started the item.
- 2026-11-04 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-04 — Created at High priority, like the rest of I02.
