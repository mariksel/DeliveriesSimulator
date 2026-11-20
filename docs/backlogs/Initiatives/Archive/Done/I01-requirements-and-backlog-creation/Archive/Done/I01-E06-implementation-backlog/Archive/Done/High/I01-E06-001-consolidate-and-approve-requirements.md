# I01-E06-001 — Consolidate and approve requirements

| Field | Value |
| --- | --- |
| ID | `I01-E06-001` |
| Parent | [I01-E06 — Implementation backlog](../../../I01-E06-implementation-backlog-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Bring every recorded answer into one requirements document, and have the user approve it.

### Questions for the user

- Is anything missing or wrong?
- Do any undecided items remain, and can implementation start without them?

### Answers so far

- Where the requirements live: the new
  [requirements](../../../../../../../../../../../design/requirements.md)
  page, which summarises and links; the stale design pages are brought up to `D0.5.0` from the
  approved records (user decisions, 2026-11-03).
- Run files, cities, and profiles:
  [FND-58](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-58--stored-records-and-shared-files),
  which resolves a conflict between FND-33, FND-57, and the module pages.
- Every area approved, nothing missing, and implementation may start with U12, U13, and U14
  open:
  [FND-59](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-59--requirements-approved).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-002 — Decide candidate capabilities](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-002-decide-candidate-capabilities.md)
- [I01-E02-004 — Failure modes, races, and drift](../../../../I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-004-failure-modes-races-and-drift.md)
- [I01-E03-002 — Visibility and screens](../../../../I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-002-visibility-and-screens.md)
- [I01-E03-003 — Tunability](../../../../I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-003-tunability.md)
- [I01-E03-004 — Scenario runner and correctness checks](../../../../I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-004-scenario-runner-and-correctness-checks.md)
- [I01-E03-005 — Offline dispatch model](../../../../I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-005-offline-dispatch-model.md)
- [I01-E03-006 — Module boundaries and dependencies](../../../../I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-006-module-boundaries-and-dependencies.md)
- [I01-E04-002 — Side-by-side comparison](../../../../I01-E04-versioning-and-comparison/Archive/Done/High/I01-E04-002-side-by-side-comparison.md)
- [I01-E04-003 — Keeping versions true to the real service](../../../../I01-E04-versioning-and-comparison/Archive/Done/High/I01-E04-003-keeping-versions-true-to-the-real-service.md)
- [I01-E05-001 — Hosting, browsers, and data](../../../../I01-E05-hosting-and-data/Archive/Done/High/I01-E05-001-hosting-browsers-and-data.md)

## Sources and evidence

- [Project foundation: FND-28](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-28--backlog-first)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready: all its dependencies are Done.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every area of the
  requirements page is approved, nothing is missing, and implementation may start with U12, U13,
  and U14 open (FND-59). Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
