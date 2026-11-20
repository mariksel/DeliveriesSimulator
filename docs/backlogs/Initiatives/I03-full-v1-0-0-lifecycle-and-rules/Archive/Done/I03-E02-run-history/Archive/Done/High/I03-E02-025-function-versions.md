# I03-E02-025 — Function versions

| Field | Value |
| --- | --- |
| ID | `I03-E02-025` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-08 |
| Last updated | 2026-11-09 |
| Completed | 2026-11-09 |

## Scope

Functions registered by name and version, and a run that knows which version of each it uses, as
[FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
records. The repository registers each function under a name and a version number; the highest
is the newest; an old version stays in the code as its own copy, for good. The repository owns
the mapping, and Application.Core declares the lookup it implements, because the core may not
import Infrastructure. A run holds which version of each function it uses, in the direct part of
the effects sub-root beside the config values, starting at the newest, and every state call
picks its function through it.

This comes before
[I03-E02-008](I03-E02-008-saved-runs-at-two-levels.md), so saved runs' schema version 1 already
holds the versions a run uses. Switching a version during a run is
[I03-E02-026](I03-E02-026-implementation-change-and-the-use-step.md).

## Acceptance criteria

- Every registered function has a name and a version, and its stored ID stays as it is, such as
  `orders.pick-up@1`.
- The lookup gives the function for a name and a version, and lists each function's versions.
- A run starts with the newest version of every function, and every state call uses the version
  the run holds; the pinned digests show nothing else changed.
- Every function version stays available, so any saved run can be recalculated.

## Dependencies

- [I03-E02-007 — Function identity and the repository](I03-E02-007-function-identity-and-the-repository.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Run history: Repository](../../../../../../../../../design/modules/run-history.md#repository)

## Internal phases

The user approved the plan below on 2026-11-08, so the implementer starts at P01.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-025-P01` | The registry by name and version, and the lookup | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-025-P02` | Calling through the versions a run holds | Done | 2026-11-09 | Approved; Implemented |

### Plan

After each phase, `npm run check` passes and the pinned digests and fingerprints hold.

1. **P01, the registry:** `IRegisteredFunction` in
   `src/infrastructure/system/functions/registered-function.ts` gains a name and a version, with
   the stored ID made from them unchanged. Application.Core declares the lookup, by name and
   version, and listing each function's versions; the repository implements it. A convention for
   where an old version's copy lives in its module is written into the Run history page.
2. **P02, the run's versions:** the direct part of the effects sub-root holds the version in use
   per function, newest at the start, persisted with the root. The 17 `callState` sites in
   `run-commands.ts`, `run-step.ts`, and `run-inputs.ts` pick their function through it. A run's
   digest covers its log entries, not its roots, so no pinned digest or fingerprint changes. The
   Run history and Simulation engine pages and the code maps follow.

## Status history

- 2026-11-08 — Created as Ready: split from I03-E02-009 when the user chose items of at most
  about three phases, and placed before I03-E02-008. Its dependency I03-E02-007 is Done. Its
  phases are recorded as the approved plan (FND-81).
- 2026-11-09 — Detail chosen by the user while building: a run carries the lookup, handed in
  when it is created or loaded and never saved, and its root saves only the version numbers
  (FND-81).
- 2026-11-09 — Done: both phases are built, and `npm run check` passes but for one WebKit
  end-to-end test timing out under load each full run, a different one each time, which pass
  alone. All 17 functions the engine calls have a name and versions; a run carries the lookup and
  its root saves the versions, and every state call goes through them. No pinned digest or
  fingerprint changed. The as-built note is in FND-81.

## Priority history

- 2026-11-08 — Created at High priority, like the epic's other items.
