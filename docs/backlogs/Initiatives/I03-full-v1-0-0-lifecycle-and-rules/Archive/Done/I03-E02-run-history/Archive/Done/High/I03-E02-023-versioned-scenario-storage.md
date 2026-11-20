# I03-E02-023 — Versioned scenario storage

| Field | Value |
| --- | --- |
| ID | `I03-E02-023` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-08 |
| Last updated | 2026-11-09 |
| Completed | 2026-11-09 |

## Scope

Scenarios kept in browser storage with the immutable structure records have, so saved runs share
a scenario instead of each copying it, as
[FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
records. A scenario splits into an unchanging `Scenario` and a `ScenarioVersion` for each edit.
A scenario is identified by its name: identical content is the same version, and different
content under the same name is a new version. A version stays while any saved run uses it, even
after its scenario is deleted. A built-in scenario is stored the same way when a run of it is
saved.

Scenarios owns the storage. Run history uses it through the module graph's link for the scenario
version a saved run ran.
[I03-E03-002](../../../../../../I03-E03-paths-and-commands/High/I03-E03-002-scenario-library.md)'s
Scenario library builds its search, tags, and organising on it.

## Acceptance criteria

- Storing a scenario gives its version; storing identical content again gives the same version,
  and different content under the same name a new one.
- A version in use by a saved run stays after its scenario is deleted, and goes once no saved
  run uses it.
- A built-in scenario is stored when a run of it is saved, as any other scenario.
- Stored scenarios have a schema version, starting at 1.

## Dependencies

None.

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Scenarios](../../../../../../../../../design/modules/scenarios.md)
- [Data](../../../../../../../../../design/data/persistence.md)

## Internal phases

The user approved the plan below on 2026-11-08, so the implementer starts at P01.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-023-P01` | Scenario versions, in the core | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-023-P02` | Their storage in IndexedDB | Done | 2026-11-09 | Approved; Implemented |

### Plan

After each phase, `npm run check` passes.

1. **P01, the core:** `Scenario` and `ScenarioVersion` beside `IScenario` in
   `src/application-core/scenarios/`, with a scenario repository declared there: store a
   scenario and get its version, find a version, note and release a saved run's use of a
   version, delete a scenario. Identity by name, and versions by content, as the scope says.
2. **P02, the storage:** its IndexedDB implementation in `src/infrastructure/scenarios/`, with
   persisted records and schema version 1, tested with the `fake-indexeddb` development package,
   which this item adds. A deleted scenario's versions stay while in use. The Scenarios and Data
   pages and the code maps follow.

## Status history

- 2026-11-08 — Created as Ready: split from I03-E02-008 when the user chose items of at most
  about three phases. It has no dependencies. Its phases are recorded as the approved plan
  (FND-81).
- 2026-11-09 — Details chosen by the user while building: a version's content is every field of
  the scenario, compared in the form the app writes it, and versions are numbered from 1 per
  name, a deleted name in use carrying its numbering on (FND-81).
- 2026-11-09 — Done: both phases are built, and `npm run check` passes. A stored scenario and its
  versions are plain records in Application.Core, with the rules for one name as pure functions
  and the repository declared there; the IndexedDB repository applies them, at schema version
  1, tested with `fake-indexeddb`. Storing a built-in scenario when a run is saved comes with
  I03-E02-008. The as-built note is in FND-81.

## Priority history

- 2026-11-08 — Created at High priority, like the epic's other items.
