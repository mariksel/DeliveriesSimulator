# I01-E02-004 — Failure modes, races, and drift

| Field | Value |
| --- | --- |
| ID | `I01-E02-004` |
| Parent | [I01-E02 — Delivery domain inventory](../../../I01-E02-delivery-domain-inventory-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

List the failures, races, and ways the two modules can drift apart that the simulator must be
able to reproduce, for the user to confirm.

### Questions for the user

- Which failures matter most?
- Should failures be injected by hand, generated at random, or explored systematically?
- When the modules drift apart, what should the simulator report?
- U8: what can Fault injection affect?

### Answers so far

- Priority, how failures are produced, the drift report, and U8's fault injection part:
  [FND-47](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-47--failures).
- Confirmed by the user on 2026-11-03 for `V1.0.0`, and unchanged in
  `V1.1.0-planned-dispatch`:
  [failures](../../../../../../../../../../../design/versions/V1.0.0/failures.md).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E02-001 — Flows, states, actors, and events](I01-E02-001-flows-states-actors-and-events.md)
- [I01-E02-003 — Technical decisions and event communication](I01-E02-003-technical-decisions-and-event-communication.md)

## Sources and evidence

- [Project foundation: FND-22](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-22--error-reporting)
- [Project foundation: Undecided items](../../../../../../../../../../../design/decisions/project-foundation.md#undecided)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to In Progress: its dependencies are Done, and the user
  approved it as Ready and started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-47, and the confirmed failures page for `V1.0.0` is in `docs/design/versions/V1.0.0/`,
  unchanged in `V1.1.0-planned-dispatch`. Archived under `Archive/Done/High/`; its epic is
  archived with it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
