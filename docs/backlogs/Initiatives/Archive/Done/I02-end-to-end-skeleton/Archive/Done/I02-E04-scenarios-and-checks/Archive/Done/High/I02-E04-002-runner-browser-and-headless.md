# I02-E04-002 — Runner, browser and headless

| Field | Value |
| --- | --- |
| ID | `I02-E04-002` |
| Parent | [I02-E04 — Scenarios and checks](../../../I02-E04-scenarios-and-checks-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The Scenario runner, in the browser and headless, using the same core.

### Outcome

- A scenario file now runs in the browser and on the command line, using the same core.
- The same scenario and seed gave the same digest of the whole event log in Node, on the command
  line, and in Chromium, Firefox, and WebKit. The tests pin that digest.
- The browser side is one plain file picker for now. The run workspace and its controls come in
  I02-E05-001.
- A run does not report pass or fail yet; the checks come in I02-E04-003.

## Acceptance criteria

- The same scenario and seed give the same result in the browser and headless.

## Dependencies

- [I02-E04-001 — Scenario format and validation](I02-E04-001-scenario-format-and-validation.md)
- [I02-E02-002 — Seeded randomness and determinism check](../../../../I02-E02-simulation-core/Archive/Done/High/I02-E02-002-seeded-randomness-and-determinism-check.md)

## Sources and evidence

- [Project foundation: FND-49](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependencies are Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: its acceptance criterion
  is met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
