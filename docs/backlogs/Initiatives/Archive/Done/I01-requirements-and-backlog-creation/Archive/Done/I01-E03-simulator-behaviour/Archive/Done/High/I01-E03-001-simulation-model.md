# I01-E03-001 — Simulation model

| Field | Value |
| --- | --- |
| ID | `I01-E03-001` |
| Parent | [I01-E03 — Simulator behaviour](../../../I01-E03-simulator-behaviour-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Decide how a simulation runs.

### Questions for the user

- Real time, virtual time, or both? What speed controls are needed?
- Must a run be exactly repeatable from a seed?
- How do simulated drivers and restaurants behave, and who defines that?
- A real map or an abstract space, and how do drivers move?
- How many orders and drivers should one run handle?

### Answers so far

- Time, repeatability, geography, scale, and behaviour profiles:
  [FND-48](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-48--simulation-model).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-001 — Confirm purpose and success](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)
- [I01-E02-001 — Flows, states, actors, and events](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-001-flows-states-actors-and-events.md)

## Sources and evidence

- [Project foundation: FND-1](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-1--purpose-and-boundary)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependencies are Done.
  No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-48. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
