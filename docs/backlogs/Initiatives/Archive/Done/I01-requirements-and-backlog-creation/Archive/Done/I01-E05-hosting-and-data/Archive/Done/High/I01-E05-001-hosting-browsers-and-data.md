# I01-E05-001 — Hosting, browsers, and data

| Field | Value |
| --- | --- |
| ID | `I01-E05-001` |
| Parent | [I01-E05 — Hosting and data](../../../I01-E05-hosting-and-data-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Settle hosting, browser support, and how long data lasts. FND-3, FND-15, FND-16, and FND-17
already set the stack, storage mechanism, and test tools.

### Questions for the user

- U5: what are the hosting and browser support?
- U3: how long is data kept, how does its shape change, and are scenarios saved?
- How are runs, scenarios, and versions shared between people?
- Where will the project be published, and how is FND-23 checked before it is?
- Should this folder become a git repository?

### Answers so far

- U5, U3, sharing, and git:
  [FND-57](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-57--hosting-and-data).
- Where the project is published, and how FND-23 is checked first: left undecided by the user
  on 2026-11-03, as U14.

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E03-001 — Simulation model](../../../../I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-001-simulation-model.md)
- [I01-E04-002 — Side-by-side comparison](../../../../I01-E04-versioning-and-comparison/Archive/Done/High/I01-E04-002-side-by-side-comparison.md)

## Sources and evidence

- [Project foundation: Undecided items](../../../../../../../../../../../design/decisions/project-foundation.md#undecided)
- [Project foundation: FND-23](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-23--safe-to-publish)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependencies are Done.
  No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-57, except where the project is published, which the user left undecided as U14.
  Archived under `Archive/Done/High/`; its epic is archived with it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
