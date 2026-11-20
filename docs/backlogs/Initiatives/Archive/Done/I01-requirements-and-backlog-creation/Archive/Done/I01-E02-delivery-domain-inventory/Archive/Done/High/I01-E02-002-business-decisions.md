# I01-E02-002 — Business decisions

| Field | Value |
| --- | --- |
| ID | `I01-E02-002` |
| Parent | [I01-E02 — Delivery domain inventory](../../../I01-E02-delivery-domain-inventory-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

List every business decision in the delivery flow, with its inputs, values, and outcomes, for
the user to confirm.

### Questions for the user

- Is the list complete once it is drafted?
- Which values and rules must be tunable?
- Should rules themselves be replaceable, or only their values?
- Which decisions need a visible explanation?

### Answers so far

- Which values and rules are tunable: all of them (FND-25), and rules can be replaced (FND-34,
  Rule editor).
- Which decisions need a visible explanation: all of them (FND-34, Decision explainer).
- Confirmed by the user on 2026-11-03 for `V1.0.0`, with the preparation time in minutes, and
  unchanged in `V1.1.0-planned-dispatch`:
  [business rules](../../../../../../../../../../../design/versions/V1.0.0/business-rules.md).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-001 — Confirm purpose and success](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)

## Sources and evidence

- [Project foundation: FND-9](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-9--sources-of-business-rules)
- [Project foundation: FND-25](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-25--simulatable-visible-and-tunable)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependency, I01-E01-001,
  is Done. No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is
  answered, and the confirmed business rules page for `V1.0.0` is in
  `docs/design/versions/V1.0.0/`, unchanged in `V1.1.0-planned-dispatch`. Archived under
  `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
