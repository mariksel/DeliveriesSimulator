# I01-E04-003 — Keeping versions true to the real service

| Field | Value |
| --- | --- |
| ID | `I01-E04-003` |
| Parent | [I01-E04 — Versioning and comparison](../../../I01-E04-versioning-and-comparison-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Decide how the simulator's versions stay faithful to the real service they represent. FND-10
stands unless the user changes it.

### Questions for the user

- How much verification is wanted beyond people's review?
- How do changes in the real service reach the simulator?
- How should the simulator show which state of the real service a version matches, without
  exposing private information?
- U2: who are the people who state rules and review the simulation?

### Answers so far

- Verification, updates, the exchange formats, and U2:
  [FND-52](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-52--conformance-exchange).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-002 — Decide candidate capabilities](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-002-decide-candidate-capabilities.md)
- [I01-E04-001 — What a version is](I01-E04-001-what-a-version-is.md)

## Sources and evidence

- [Project foundation: FND-10](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-10--checking-against-the-real-service)
- [Project foundation: Undecided items](../../../../../../../../../../../design/decisions/project-foundation.md#undecided)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to In Progress: its dependencies were Done from the time
  I01-E04-001 closed, which was not raised then; the user approved it as Ready and started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-52, which also resolves U2. Archived under `Archive/Done/High/`; its epic is archived
  with it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
