# I02-E04-001 — Scenario format and validation

| Field | Value |
| --- | --- |
| ID | `I02-E04-001` |
| Parent | [I02-E04 — Scenarios and checks](../../../I02-E04-scenarios-and-checks-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The Readable scenario format, in JSON, and Scenario validation. It covers the starting state and
the steps this stage needs.

### Outcome

- The [scenario format](../../../../../../../../../../../design/modules/scenario-format.md) page
  documents it, with an example.
- An invalid scenario is refused with a typed result that lists everything wrong, with where it is
  and what is wrong. The tests check 27 kinds of mistake.
- The file does not run yet; I02-E04-002 connects it to the run.
- Decisions:
  [FND-70](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-70--scenario-format).

## Acceptance criteria

- The format is documented and people can read it.
- An invalid scenario is refused with a typed result that says what is wrong.

## Dependencies

- [I02-E03-004 — Scripted restaurant and driver](../../../../I02-E03-v1-0-0-happy-path/Archive/Done/High/I02-E03-004-scripted-restaurant-and-driver.md)

## Sources and evidence

- [Project foundation: FND-21](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-21--validation)
- [Project foundation: FND-22](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-22--error-reporting)
- [Project foundation: FND-49](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E03-004, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: every acceptance criterion
  is met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
