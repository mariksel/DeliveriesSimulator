# I01-E01-001 — Confirm purpose and success

| Field | Value |
| --- | --- |
| ID | `I01-E01-001` |
| Parent | [I01-E01 — Vision and scope](../../../I01-E01-vision-and-scope-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Confirm how the simulator's results will be used and what makes it a success. FND-7 already sets
the users.

### Questions for the user

- What does business correctness mean for the delivery flow?
- What does technical correctness mean for the delivery flow?
- Which decisions should the simulator's results support?
- What result would make the simulator a success?
- What is explicitly out of scope?
- U9: what counts as private? Do the real service's rules, constants, event names, and internal
  identifiers count, given that the simulator has to implement its behaviour and stay safe to
  publish?

### Answers so far

- U9: only identity is private, recorded in
  [FND-23](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-23--safe-to-publish).
- Business correctness:
  [FND-29](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-29--business-correctness).
  The user asked for further criteria.
- Technical correctness:
  [FND-30](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-30--technical-correctness).
  The user asked for further criteria.
- Decisions the results support:
  [FND-31](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-31--decisions-the-results-support).
  The user asked for further decisions.
- Success:
  [FND-32](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-32--success).
  The user asked for further suggestions.
- Out of scope:
  [FND-33](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-33--out-of-scope).
- A conflict between the real service's documents about rejected requests was resolved in
  [FND-29](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-29--business-correctness).
  A rejection closes the request, and an ignore keeps it open.

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

None.

## Sources and evidence

- [Project foundation: FND-7](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-7--users)
- [Project foundation: FND-23](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-23--safe-to-publish)
- [Project foundation: FND-24](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-24--goal-is-correctness)
- [Project foundation: Undecided items](../../../../../../../../../../../design/decisions/project-foundation.md#undecided)
- [Project foundation: FND-29](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-29--business-correctness)
- [Project foundation: FND-30](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-30--technical-correctness)
- [Project foundation: FND-31](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-31--decisions-the-results-support)
- [Project foundation: FND-32](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-32--success)
- [Project foundation: FND-33](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-33--out-of-scope)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Ready. It has no dependencies, and the user approved starting
  requirements gathering here.
- 2026-11-03 — Moved from Ready to In Progress: requirements gathering with the user started. U9
  and the correctness and decisions questions are answered; success and scope are still open.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  and recorded in the project foundation (FND-23 and FND-29 to FND-33). Archived under
  `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
