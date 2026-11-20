# I03-E02-026 — Implementation change and the use step

| Field | Value |
| --- | --- |
| ID | `I03-E02-026` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-08 |
| Last updated | 2026-11-10 |
| Completed | 2026-11-10 |

## Scope

Switching a function's version during a run, as
[FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
records. Each switch is an `ImplementationChange` commit, a direct effect kind, which writes a
`FunctionVersionSwitched` log entry from the Simulation engine with the function's name and its
versions before and after.

- **In a scenario:** a step with `use` in place of an actor, a command, and an order, listing
  each function and its version, as a `set` step lists rule changes:
  `{ "at": "h00:m10:s00:ms00", "use": [{ "function": "orders.pick-up", "version": 2 }] }`.
  Reading the scenario checks that each function and version exists.
- **By hand:** the Rules panel lists each module's functions and their versions beside its
  rules, read through the lookup I03-E02-025 declares, and switches one, forking first when an
  earlier commit is shown, as rule changes do. Repeat makes a hand-made switch again.

Saved runs move to schema version 2 here, with a migration from version 1.

## Acceptance criteria

- A `use` step and a switch in the Rules panel each make an `ImplementationChange` commit, and
  later calls use the new version.
- Reading a scenario refuses a function or version that doesn't exist, with its place.
- A switch from an earlier commit forks first; Repeat makes a hand-made switch again.
- A run saved at schema version 1 loads after migrating to version 2.

## Dependencies

- [I03-E02-025 — Function versions](I03-E02-025-function-versions.md)
- [I03-E02-008 — Saved runs at two levels](I03-E02-008-saved-runs-at-two-levels.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Simulation engine: Kinds of effect](../../../../../../../../../design/modules/simulation-engine.md#kinds-of-effect)
- [Scenario format](../../../../../../../../../design/modules/scenario-format.md)

## Internal phases

The user approved the plan below on 2026-11-08, so the implementer starts at P01.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-026-P01` | The implementation change commit, and schema version 2 | Done | 2026-11-10 | Approved; Built; `npm run check` passes |
| `I03-E02-026-P02` | The `use` step | Done | 2026-11-10 | Approved; Built; `npm run check` passes |
| `I03-E02-026-P03` | Switching in the Rules panel, forks, and Repeat | Done | 2026-11-10 | Approved; Built; `npm run check` passes |

### Plan

After each phase, `npm run check` passes.

1. **P01, the commit:** `ImplementationChange` joins `EffectKind` in `direct-effect.ts` and so
   `CommitKind`, with its effect data, digest, and persisted form, and
   `FunctionVersionSwitched` joins the log's kinds, with its digest and persisted form. Making
   one updates the versions the run holds. Saved runs move to schema version 2, with its
   migration and a test on a version 1 run.
2. **P02, the step:** `read-scenario.ts` reads a `use` step and checks each function and version
   through the lookup; `scripted-step.ts`, `schedule-scenario.ts`, and the run's inputs carry it,
   and its commit counts as a step run, as a `set` step's does.
3. **P03, by hand:** the Rules panel lists each module's functions and versions and switches one,
   through `simulation-run.ts`, `live-scenario-run.ts`, and `watched-run.ts`, forking first from
   an earlier commit; `run-repeat.ts` makes a hand-made switch again. The Scenario format,
   Simulation engine, Business rules, and Run history pages and the end-to-end tests follow.

## Status history

- 2026-11-08 — Created as Proposed: split from I03-E02-009 when the user chose items of at most
  about three phases. It starts when I03-E02-025 and I03-E02-008 are Done. Its phases are
  recorded as the approved plan (FND-81).
- 2026-11-09 — Moved from Proposed to Ready: its dependencies I03-E02-025 and I03-E02-008 are Done.
- 2026-11-10 — P01 Done: an implementation change commit switches state functions to other versions,
  putting them in use for every later state call, and writes a `FunctionVersionSwitched` entry
  for each function whose version changed; a version the run's lookup does not hold is refused.
  Saved runs are at schema version 2, a version 1 record reading as it is, and a version 1
  database opens at version 2 keeping its runs. `npm run check` passes; full runs still had a
  WebKit end-to-end test time out in Playwright's wait for an element to be stable, which a probe
  showed is not the page moving, and the rerun passed all 372 (FND-81).
- 2026-11-10 — P02 Done: a scenario's `use` step is read with each function and version checked
  against the registry, refused with its place otherwise, and runs as an implementation change
  that counts as a step run; stored scenarios and saved runs keep it. `npm run check` passes
  (FND-81).
- 2026-11-10 — Detail chosen by the user while building P03: WebKit's end-to-end tests run at
  most four at once, as with more beside the other browsers it timed out waiting for elements to
  settle in nearly every full run, a different test each time, though probes showed the page
  still.
- 2026-11-10 — P03 Done: the Rules panel lists Orders' and Deliveries' state functions with the
  version in use at the commit shown and every version the lookup holds, and switches one,
  forking first from an earlier commit; Repeat from here makes a hand-made switch again.
  `npm run check` passes (FND-81).
- 2026-11-10 — Done: all three phases are built. A run switches state functions to other versions by
  an implementation change commit, from a scenario's `use` step or the Rules panel, and saved
  runs, at schema version 2, keep each switch. `npm run check` passes (FND-81).

## Priority history

- 2026-11-08 — Created at High priority, like the epic's other items.
