# I02-E04-004 — First built-in scenario

| Field | Value |
| --- | --- |
| ID | `I02-E04-004` |
| Parent | [I02-E04 — Scenarios and checks](../../../I02-E04-scenarios-and-checks-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The first scenario of the built-in library: the happy path of one order.

### Outcome

- The built-in library has its first scenario, the happy path of one order, which the application
  ships with. It passes on all four criteria in Chromium, Firefox, and WebKit, and on the command
  line, and tests check each of these.
- The Determinism check finds no difference between two runs of it with the same seed.
- Running a scenario now says whether it passed. The browser lists each criterion and why it
  failed, and the command line reports the same and exits with code 1. This goes for any scenario
  file too.
- Judging a run belongs to Verification, because the module map lets Verification use Scenarios and
  not the other way round. So the panel moved to `src/ui/verification`.

## Acceptance criteria

- The scenario passes in the browser and headless, on all four criteria.
- The Determinism check finds no difference between two runs of this scenario with the same seed.
  This moved here from I02-E02-002.

## Dependencies

- [I02-E04-003 — Invariant checker, first criteria](I02-E04-003-invariant-checker-first-criteria.md)

## Sources and evidence

- [Project foundation: FND-49](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)
- [Project foundation: FND-60](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-60--implementation-stages)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E04-003, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-04 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
