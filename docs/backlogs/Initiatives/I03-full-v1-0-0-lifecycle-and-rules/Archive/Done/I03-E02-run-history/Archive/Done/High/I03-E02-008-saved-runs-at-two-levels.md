# I03-E02-008 — Saved runs at two levels

| Field | Value |
| --- | --- |
| ID | `I03-E02-008` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-09 |
| Completed | 2026-11-09 |

## Scope

Save a run in browser storage at "everything" or "minimum", move a saved run between them, and
load it back: the storage and the levels, with no screens.
[I03-E02-024](I03-E02-024-saved-run-screens-and-deleting-branches.md) builds the screens and
deleting branches, and
[I03-E02-023](I03-E02-023-versioned-scenario-storage.md) the scenario storage a saved run points
at. Checkpoints come at the city stage. This brings part of `I05` 's stored runs forward.

The minimum keeps the start state and what can't be recalculated: each commit's function and
arguments, what came from outside, indirect effects, and log entries, with a short digest of
each commit's root. It drops each commit's main root, which loading rebuilds by running each
commit again on the root before it, in chunks that report progress; that may take about as long
as running the run.

A saved run holds its name, its level, its schema version, starting at 1, and the ID of the
scenario version it ran. Its size is the bytes it takes, with how many commits and branches it
holds. Saving a run that doesn't fit in browser storage stores nothing and fails with a reason,
which the screens show. The run repository becomes asynchronous, as IndexedDB is, and an
IndexedDB implementation replaces the one in memory in the app, unit-tested with the
`fake-indexeddb` development package that I03-E02-023 adds (FND-81).

## Acceptance criteria

- A run saved at either level loads back and shows the same timeline.
- Moving a run down and back up gives identical states at every commit.
- At "minimum", each commit keeps a digest of its change, chained with the one before, and
  every rebuilt root matches it.
- At "everything", a record version or an effect is saved once, not once for every commit that
  holds it.
- Loading at "minimum" reports its progress as it rebuilds.
- Saving a run that doesn't fit stores nothing and fails with a reason.
- Saved data has a schema version and a migration, which a test runs on a made-up older record.

## Dependencies

- [I03-E02-007 — Function identity and the repository](I03-E02-007-function-identity-and-the-repository.md)
- [I03-E02-021 — Links across the sub-roots](I03-E02-021-links-across-the-sub-roots.md)
- [I03-E02-022 — Indirect effect labels and config change links](I03-E02-022-indirect-effect-labels-and-config-change-links.md)
- [I03-E02-023 — Versioned scenario storage](I03-E02-023-versioned-scenario-storage.md)
- [I03-E02-025 — Function versions](I03-E02-025-function-versions.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Project foundation: FND-57](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-57--hosting-and-data)
- [Run history](../../../../../../../../../design/modules/run-history.md)

## Internal phases

The user approved the plan below on 2026-11-08, and re-planned it on 2026-11-09 with a fourth
phase, P04, built second, so the work goes P01, P04, P02, P03.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-008-P01` | Asynchronous storage in IndexedDB, with a schema version | Done | 2026-11-09 | Approved; Built; `npm run check` passes |
| `I03-E02-008-P02` | "Minimum", rebuilt from calls with progress | Done | 2026-11-09 | Approved; Built; `npm run check` passes; measured on a tenth of a city day |
| `I03-E02-008-P03` | Moving between levels, measured on a city day | Done | 2026-11-09 | Approved; Built; `npm run check` passes; measured on a city day |
| `I03-E02-008-P04` | The shared form at "everything" | Done | 2026-11-09 | Approved; Built; `npm run check` passes; measured on a tenth of a city day |

### Plan

After each phase, `npm run check` passes.

1. **P01, storage:** `RunRepository` in `src/application-core/run-history/` becomes
   asynchronous, with save, load, list, delete, and level. An IndexedDB implementation in
   `src/infrastructure/run-history/` replaces `MemoryRunRepository` in the app, tested with
   `fake-indexeddb`. `IPersistedRun` gains the schema version, starting at 1, the name, the level,
   and the scenario version's ID, and a migration chain runs on load, tested on a made-up older
   record; the first migration keeps reading branches stored under their old name, timelines. A
   run's size is its bytes, commits, and branches. A `QuotaExceededError` becomes a typed failure
   that stores nothing.
2. **P04, the shared form, built second:** a saved commit holds only its change from its
   parent root: each keyed collection's changed and removed entries, each list's added items,
   and each other value only when it changed. Its direct and indirect effects are held once, in
   the commit, and a version is saved without repeating the versions before it that its parent
   root holds. Loading applies each change to its parent root, so roots share structure again.
3. **P02, minimum:** saving at "minimum" drops each commit's change and keeps a digest of it,
   chained with the digest before it.
   Rebuilding a root from its parent and its call moves from
   `function-fingerprints.spec.ts` into Application.Core, extended to effect and indirect commits,
   and runs in chunks that report progress. Loading at either level gives the same run, and
   every rebuilt root matches its digest.
4. **P03, levels:** a saved run moves to the other level and back with identical states at every
   commit. A city day is saved and loaded at both levels with `scripts/benchmark-city.mjs`, and
   the numbers go to the user if a target is missed. The Run history, Data, and Scenarios pages
   and the code maps follow.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-06 — Moved from Proposed to Ready: its dependency I03-E02-007 is Done.
- 2026-11-08 — Scope widened: nothing in the app saved a run yet, so the user chose the screens
  this item builds: Save with a level, a list of saved runs, Open, moving level, and Delete
  (FND-81).
- 2026-11-08 — Details chosen by the user: the minimum drops roots and log entries, the size is
  bytes with commits and branches, and the migration is proven on a made-up older record
  (FND-81).
- 2026-11-08 — Revised by the user after checking the code: a state commit's log entries need the
  cause its step gave, so the minimum keeps them and drops only the roots. Scope widened:
  deleting a branch, which FND-87 left for later, comes here (FND-81).
- 2026-11-08 — Details chosen by the user: a saved run is named when saved, and opens like a live
  run (FND-81).
- 2026-11-08 — Moved from Ready to Proposed: the user chose that I03-E02-021 and I03-E02-022 come
  first, so schema version 1 holds their links, and they are not Done yet (FND-81).
- 2026-11-08 — Scope widened: a saved run keeps its scenario, so this item builds versioned
  scenario storage that saved runs share, as the user chose (FND-81).
- 2026-11-08 — Details chosen by the user: what happens when storage is full, and how long
  opening at "minimum" may take (FND-81).
- 2026-11-08 — Split and planned: the user chose items of at most about three phases. Scenario
  storage moved to I03-E02-023 and the screens and deleting branches to I03-E02-024; this item
  keeps the storage and the levels, depends on I03-E02-023 and I03-E02-025 too, keeps a digest
  of each root at "minimum", and has its phases recorded as the approved plan (FND-81).
- 2026-11-09 — Moved from Proposed to Ready: its dependencies I03-E02-007, I03-E02-021,
  I03-E02-022, I03-E02-023, and I03-E02-025 are Done.
- 2026-11-09 — Detail chosen by the user while building: each saved run has its own ID from the
  repository, and names may repeat, so saving never overwrites (FND-81).
- 2026-11-09 — Detail chosen by the user: the digest kept at "minimum" is a chain over each
  commit's changes rather than a digest of each whole root (FND-81).
- 2026-11-09 — Re-planned by the user: the saved form shares structure as memory does, as the
  form I03-E02-007 built, each commit with its whole root, would take about 410 GB on a tenth of
  a city day. A fourth phase, P04, builds it, second, in this item rather than a new one; an
  acceptance criterion is added and the one on digests follows (FND-81).
- 2026-11-09 — Detail chosen by the user while building P04: saving finds each commit's change
  by skipping the internal parts of Immutable's collections that the parent root shares, falling
  back to checking each entry, as checking each entry would take about 7 minutes on a city day
  (FND-81).
- 2026-11-09 — P01 and P04 Done: saved runs are stored in IndexedDB at schema version 1, with a
  migration from branches stored as timelines, and each saved commit holds its root's change. A
  tenth of a city day saves in 35 MB in about a second and loads in about two, and
  `npm run check` passes. P02 is next (FND-81).
- 2026-11-09 — P02 Done: at minimum each commit keeps a chained digest of its change, and
  opening it works every root out again in chunks that tell their progress, each checked against
  its digest. A tenth of a city day takes 26 MB at minimum against 35 at everything, and opens in
  about 4 seconds against 2; `npm run check` passes. P03 is next (FND-81).
- 2026-11-09 — P03 Done, and the item Done: a saved run moves between levels under its ID, keeping
  its old level when the moved run does not fit, and its size is counted commit by commit. A city
  day, 254,524 commits, takes 242 MB at everything, saved in 8 seconds and loaded in 11, and
  146 MB at minimum, saved in 10 and loaded in 56, where the run took 55; both gave the same run.
  `npm run check` passes; one full run had two WebKit end-to-end tests time out under load, and
  the gaps test also fails about once in 20 to 30 runs alone, a flaky test from I03-E02-016; the
  rerun passed all 357. The as-built notes are in FND-81.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
