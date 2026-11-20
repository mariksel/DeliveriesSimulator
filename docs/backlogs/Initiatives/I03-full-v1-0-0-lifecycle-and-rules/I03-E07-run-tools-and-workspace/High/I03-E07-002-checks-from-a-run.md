# I03-E07-002 — Checks from a run

| Field | Value |
| --- | --- |
| ID | `I03-E07-002` |
| Parent | [I03-E07 — Run tools and workspace](../I03-E07-run-tools-and-workspace-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Checks from a run: turns an observed run into the expected-outcome checks of a new scenario.

## Acceptance criteria

- A check made from a passing run passes when the scenario runs again.
- A behaviour change makes it fail.

## Dependencies

- [I03-E03-002 — Scenario library](../../I03-E03-paths-and-commands/High/I03-E03-002-scenario-library.md)

## Sources and evidence

- [Scenarios](../../../../../design/modules/scenarios.md)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
