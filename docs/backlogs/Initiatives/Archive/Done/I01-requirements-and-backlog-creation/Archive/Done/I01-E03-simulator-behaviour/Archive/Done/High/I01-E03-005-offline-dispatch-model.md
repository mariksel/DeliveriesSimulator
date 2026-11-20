# I01-E03-005 — Offline dispatch model

| Field | Value |
| --- | --- |
| ID | `I01-E03-005` |
| Parent | [I01-E03 — Simulator behaviour](../../../I01-E03-simulator-behaviour-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Decide what dispatch analysis is needed separately from running the full flow.

### Questions for the user

- Which questions should it answer?
- Is it a separate mode, or the same simulation with parts turned off?
- Which results and charts are needed?
- Which input data should it use, given FND-23?

### Answers so far

- Questions, mode, results, and input:
  [FND-55](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-55--offline-dispatch-model).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-002 — Decide candidate capabilities](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-002-decide-candidate-capabilities.md)
- [I01-E02-002 — Business decisions](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-002-business-decisions.md)

## Sources and evidence

- [Project foundation: FND-8](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list)
- [Project foundation: FND-23](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-23--safe-to-publish)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependencies are Done.
  No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-55. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
