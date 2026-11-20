# I03-E02-009 — Snapshot tests

| Field | Value |
| --- | --- |
| ID | `I03-E02-009` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-10 |
| Completed | 2026-11-10 |

## Scope

Rerun a saved run statelessly, with both its own function versions and the newest ones, and
compare against its stored states. The first shows that recalculating is exact, and the second
shows the first commit a breaking change affects.

Verification owns these tests, and reads saved runs through Run history. Function versions and
the implementation change moved to
[I03-E02-025](I03-E02-025-function-versions.md) and
[I03-E02-026](I03-E02-026-implementation-change-and-the-use-step.md).

A rerun with the run's own versions compares each commit's rebuilt root with its stored root,
or, at "minimum", with the digest kept for it. Rerunning with the newest versions runs each
stored call again with the newest version of its function, except where the run switched one,
which is used from the switch on as recorded, and reports the first commit whose result differs.

The tests run in `npm run check` over saved runs kept in the repository: one per built-in
scenario, at "minimum", as JSON files of their persisted records in
`src/infrastructure/verification/snapshots/`, made by a script in `scripts/` and made again only
when a new function version is added. They also run as a Snapshot test action on a saved run,
in the list of saved runs.

## Acceptance criteria

- A rerun with the run's own versions matches at every commit, at either level.
- A deliberate behaviour change shows the first commit it affects.
- A run that switched a version keeps that version from the switch on, in a newest-version rerun.
- `npm run check` runs the snapshot tests over the repository's saved runs.
- The Snapshot test action shows whether a saved run matched, and the first commit that didn't.

## Dependencies

- [I03-E02-008 — Saved runs at two levels](I03-E02-008-saved-runs-at-two-levels.md)
- [I03-E02-024 — Saved-run screens and deleting branches](I03-E02-024-saved-run-screens-and-deleting-branches.md)
- [I03-E02-026 — Implementation change and the use step](I03-E02-026-implementation-change-and-the-use-step.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Verification](../../../../../../../../../design/modules/verification.md)

## Internal phases

The user approved the plan below on 2026-11-08, so the implementer starts at P01.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-009-P01` | Rerunning with own and newest versions, in the core | Done | 2026-11-10 | Approved; Built; `npm run check` passes |
| `I03-E02-009-P02` | The repository's saved runs, in `npm run check` | Done | 2026-11-10 | Approved; Built; `npm run check` passes |
| `I03-E02-009-P03` | The Snapshot test action | Done | 2026-11-10 | Approved; Built; `npm run check` passes |

### Plan

After each phase, `npm run check` passes.

1. **P01, the core:** in Verification, a snapshot test loads a saved run through Run history and
   reruns its stored calls with the run's own versions, comparing each rebuilt root with the
   stored root or its digest, and with the newest versions, keeping the run's recorded switches.
   It reports whether every commit matched, and the first that didn't. A version 2 registered
   only in a test shows a deliberate behaviour change caught at its first commit.
2. **P02, the repository's runs:** a script in `scripts/` saves a run of each built-in scenario
   at "minimum" as JSON in `src/infrastructure/verification/snapshots/`, and a test that
   `npm run check` runs reads each file and runs both reruns.
3. **P03, the action:** each saved run in the list on the Runs and scenarios page gets a
   Snapshot test action, which shows the result and the first differing commit, and selects it
   when the run is opened. The Verification and Run history pages and the end-to-end tests
   follow.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Scope widened: FND-81 planned the implementation change commit kind for after
  I03-E02-007, which did not build it, and the user chose that this item builds it.
- 2026-11-08 — Details chosen by the user: functions are registered by name and version number,
  and an old version is kept as its own copy (FND-81).
- 2026-11-08 — Details chosen by the user: every version stays for good, which changes the third
  acceptance criterion; the tests run both in `npm run check` and in the app; the newest-version
  rerun runs the stored calls again; and a version is switched by a scenario step or by hand
  (FND-81).
- 2026-11-08 — The user chose the saved runs the automated tests use: one for each built-in
  scenario, at the minimum level (FND-81).
- 2026-11-08 — The user chose the scenario step that switches a version: a `use` step (FND-81).
- 2026-11-08 — Details chosen by the user: kept runs as JSON files, switching by hand in the
  Rules panel and again on Repeat, and schema version 2 with a migration (FND-81).
- 2026-11-08 — The user chose that a newest-version rerun keeps the run's recorded version
  switches (FND-81).
- 2026-11-08 — Split and planned: the user chose items of at most about three phases. Function
  versions moved to I03-E02-025 and the implementation change and the `use` step to
  I03-E02-026, which this item now depends on, with I03-E02-024; a run at "minimum" is compared
  through its root digests; the acceptance criteria follow, and the phases are recorded as the
  approved plan (FND-81).
- 2026-11-10 — Moved from Proposed to Ready: its dependencies I03-E02-008, I03-E02-024, and
  I03-E02-026 are Done.
- 2026-11-10 — P01 Done: a snapshot test reruns each branch's own state commits on their stored
  parent roots, with the run's own versions or the newest, keeping a switched function at its
  recorded version, and reports the first commit whose state differs, compared field by field. A
  run saved at minimum that no longer matches its digest names that commit as it opens. A test's
  version 2 of mark ready is caught at the first commit that marks an order ready.
  `npm run check` passes (FND-81).
- 2026-11-10 — P02 Done: `npm run snapshots` keeps a run of each built-in scenario at minimum
  in `src/infrastructure/verification/snapshots/`, which formatting leaves as written, and
  `npm run check` opens and reruns each with its own versions and the newest, checks every
  built-in has one, and checks the script still makes the file kept. One full run had the gaps
  test from I03-E02-016 fail, its collapsed row drawn just below sight; it passed 45 times alone
  and on the rerun, which passed all 375 (FND-81).
- 2026-11-10 — P03 Done, and the item Done: each saved run in the list has a Snapshot test action,
  which opens the run once, reruns it with its own versions and the newest, and says on its row
  whether every state commit matched or which differed first, which opening the run then shows.
  `npm run check` passes (FND-81).

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
