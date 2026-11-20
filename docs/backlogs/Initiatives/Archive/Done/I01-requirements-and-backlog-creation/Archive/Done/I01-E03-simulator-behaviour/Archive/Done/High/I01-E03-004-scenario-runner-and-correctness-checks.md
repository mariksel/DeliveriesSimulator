# I01-E03-004 — Scenario runner and correctness checks

| Field | Value |
| --- | --- |
| ID | `I01-E03-004` |
| Parent | [I01-E03 — Simulator behaviour](../../../I01-E03-simulator-behaviour-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Decide how scenarios are written and run, and how a run is judged correct.

### Questions for the user

- Who writes scenarios, and in what format?
- What counts as pass or fail?
- Where do the expected outcomes and invariants come from?
- Which scenarios must exist first?
- Do scenarios run only in the browser, or also unattended?
- U11: what are the targets and limits behind FND-29 and FND-30, such as performance targets,
  the convergence time bound, and clock limits?

### Answers so far

- Format, authors, where scenarios run, and pass and fail:
  [FND-49](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios).
- U11, the targets and limits:
  [FND-50](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-50--targets-and-limits).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-002 — Decide candidate capabilities](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-002-decide-candidate-capabilities.md)
- [I01-E02-004 — Failure modes, races, and drift](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-004-failure-modes-races-and-drift.md)
- [I01-E03-001 — Simulation model](I01-E03-001-simulation-model.md)

## Sources and evidence

- [Project foundation: FND-8](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list)
- [Project foundation: FND-17](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-17--test-tools)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to In Progress: its dependencies are Done, and the user
  approved it as Ready and started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-49 and FND-50, which resolves U11. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
