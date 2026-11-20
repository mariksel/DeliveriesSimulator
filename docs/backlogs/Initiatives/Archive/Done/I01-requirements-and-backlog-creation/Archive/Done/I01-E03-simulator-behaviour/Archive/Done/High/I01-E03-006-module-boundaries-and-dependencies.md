# I01-E03-006 — Module boundaries and dependencies

| Field | Value |
| --- | --- |
| ID | `I01-E03-006` |
| Parent | [I01-E03 — Simulator behaviour](../../../I01-E03-simulator-behaviour-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Settle the module questions the foundation left open.

### Questions for the user

- U7: which module owns drivers, and how do Payments and Business rules divide pricing?
- U8: what are the other module dependencies, and do Technical view and Run history read Event
  log?
- Which FND-8 module owns each of the FND-34 capabilities? The user moved this question here
  from I01-E01-002 on 2026-11-03.
- U10: which module owns versions and comparison?

### Answers so far

- U7 and U10:
  [FND-56](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries).
- Stale module descriptions fixed on 2026-11-03: Map and routing, Import and export,
  Notifications, and Customers and restaurants.
- Capability ownership, group by group:
  [capability ownership](../../../../../../../../../../../design/modules/capability-ownership.md).
  The Report generator's owner is undecided (U13).
- U8: the Event log part in FND-56, and the full dependency graph, confirmed on 2026-11-03,
  in the [module map](../../../../../../../../../../../design/modules/README.md#dependency-graph).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E02-001 — Flows, states, actors, and events](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-001-flows-states-actors-and-events.md)
- [I01-E01-002 — Decide candidate capabilities](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-002-decide-candidate-capabilities.md)

## Sources and evidence

- [Project foundation: Undecided items](../../../../../../../../../../../design/decisions/project-foundation.md#undecided)
- [Project foundation: FND-8](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependencies are Done.
  No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-56, the capability ownership page, and the confirmed dependency graph, which resolve
  U7, U8, and U10. Archived under `Archive/Done/High/`; its epic is archived with it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
