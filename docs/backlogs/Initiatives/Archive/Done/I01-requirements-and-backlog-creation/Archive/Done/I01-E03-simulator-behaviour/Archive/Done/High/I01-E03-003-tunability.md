# I01-E03-003 — Tunability

| Field | Value |
| --- | --- |
| ID | `I01-E03-003` |
| Parent | [I01-E03 — Simulator behaviour](../../../I01-E03-simulator-behaviour-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Decide what can be changed and when.

### Questions for the user

- Can values change during a run, or only between runs?
- Is a tuned setup a new version, or a variation of an existing one?
- Should tuned setups be saved and shared?
- Should values be restricted to valid ranges?

### Answers so far

- When values change, presets and versions, sharing, and ranges:
  [FND-54](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-54--tunability).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E02-002 — Business decisions](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-002-business-decisions.md)
- [I01-E02-003 — Technical decisions and event communication](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-003-technical-decisions-and-event-communication.md)
- [I01-E04-001 — What a version is](../../../../I01-E04-versioning-and-comparison/Archive/Done/High/I01-E04-001-what-a-version-is.md)

## Sources and evidence

- [Project foundation: FND-25](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-25--simulatable-visible-and-tunable)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependencies are Done.
  No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-54. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
