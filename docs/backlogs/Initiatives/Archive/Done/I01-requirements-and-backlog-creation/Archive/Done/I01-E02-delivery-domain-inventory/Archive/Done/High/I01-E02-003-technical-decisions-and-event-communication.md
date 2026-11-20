# I01-E02-003 — Technical decisions and event communication

| Field | Value |
| --- | --- |
| ID | `I01-E02-003` |
| Parent | [I01-E02 — Delivery domain inventory](../../../I01-E02-delivery-domain-inventory-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

List the technical mechanisms behind the event-driven communication between the orders and
deliveries modules, with their timing and failure behaviour, for the user to confirm.

### Questions for the user

- How much technical detail should be modelled: transactions, polling, leases, or individual
  tables?
- Which mechanisms must be visible step by step?
- Which timings and limits must be tunable?
- Should notification delivery and the client apps be part of the simulation?

### Answers so far

- Technical detail, and the push and device model: full detail, with a full device model,
  [FND-46](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail).
- Which mechanisms are visible step by step, and which timings and limits are tunable: all of
  them,
  [FND-25](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-25--simulatable-visible-and-tunable).
- Confirmed by the user on 2026-11-03 for `V1.0.0`, and unchanged in
  `V1.1.0-planned-dispatch`:
  [module communication](../../../../../../../../../../../design/versions/V1.0.0/module-communication.md).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-001 — Confirm purpose and success](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)

## Sources and evidence

- [Project foundation: FND-24](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-24--goal-is-correctness)
- [Project foundation: FND-25](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-25--simulatable-visible-and-tunable)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependency, I01-E01-001,
  is Done. No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  (FND-25 and FND-46), and the confirmed module communication page for `V1.0.0` is in
  `docs/design/versions/V1.0.0/`, unchanged in `V1.1.0-planned-dispatch`. Archived under
  `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
