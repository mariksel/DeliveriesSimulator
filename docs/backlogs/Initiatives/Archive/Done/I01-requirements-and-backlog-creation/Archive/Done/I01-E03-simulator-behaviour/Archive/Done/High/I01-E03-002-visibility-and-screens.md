# I01-E03-002 — Visibility and screens

| Field | Value |
| --- | --- |
| ID | `I01-E03-002` |
| Parent | [I01-E03 — Simulator behaviour](../../../I01-E03-simulator-behaviour-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Decide what must be visible and how, within the business view and technical view in FND-8.

### Questions for the user

- U6: what are the screens and navigation, and is the map drawn or only calculated?
- Which views are needed, such as a timeline, a sequence diagram, module state, or outbox and
  inbox tables?
- What level of detail is needed for each event and decision?
- Which view should be the main one?

### Answers so far

- U6, the screens and navigation, the main view, and the business and technical views:
  [FND-53](../../../../../../../../../../../design/decisions/project-foundation/ui.md#fnd-53--ui-organisation).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E02-002 — Business decisions](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-002-business-decisions.md)
- [I01-E02-003 — Technical decisions and event communication](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-003-technical-decisions-and-event-communication.md)

## Sources and evidence

- [Project foundation: FND-25](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-25--simulatable-visible-and-tunable)
- [Project foundation: Undecided items](../../../../../../../../../../../design/decisions/project-foundation.md#undecided)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependencies are Done.
  No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-34, FND-46, and FND-53, which resolves U6. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
