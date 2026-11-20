# I03-E03-002 — Scenario library

| Field | Value |
| --- | --- |
| ID | `I03-E03-002` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Ready |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-09 |
| Completed | Not completed |

## Scope

Scenario library: search, tag, and organise saved scenarios, saved through the repository to
browser storage. It holds each path's built-in scenario from this epic on. It is one of the
parts of storage that FND-80 brought forward.

## Acceptance criteria

- Scenarios can be saved, found by search or tag, opened, and deleted.
- Built-in scenarios can't be overwritten.
- Saved scenarios have a schema version and a migration.

## Dependencies

- [I03-E02-007 — Function identity and the repository](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-007-function-identity-and-the-repository.md)
- [I03-E02-023 — Versioned scenario storage](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-023-versioned-scenario-storage.md)

## Sources and evidence

- [Scenarios](../../../../../design/modules/scenarios.md)
- [Project foundation: FND-80](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-80--planning-stage-i03)
- [Project foundation: FND-57](../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-57--hosting-and-data)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-06 — Moved from Proposed to Ready: its dependency I03-E02-007 is Done.
- 2026-11-08 — Moved from Ready to Proposed: the user chose that the library builds on
  I03-E02-023's versioned scenario storage, which is not Done yet (FND-81).
- 2026-11-09 — Moved from Proposed to Ready: its dependencies I03-E02-007 and I03-E02-023 are
  Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
