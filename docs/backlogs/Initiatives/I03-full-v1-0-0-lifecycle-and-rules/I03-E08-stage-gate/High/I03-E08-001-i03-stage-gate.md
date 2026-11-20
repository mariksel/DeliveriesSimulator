# I03-E08-001 — I03 stage gate

| Field | Value |
| --- | --- |
| ID | `I03-E08-001` |
| Parent | [I03-E08 — Stage gate](../I03-E08-stage-gate-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | Not completed |

## Scope

The stage gate for `I03`: every path, command, and rule of `V1.0.0` works, its scenarios, tests,
and checks pass, the design pages, code maps, and statuses match the code, and the user has run
it and approved it. Implementation status changes to Implemented only where code exists.

## Acceptance criteria

- Every built-in scenario passes in the browser and headless.
- `npm run check` passes, and a full mutation run shows no new gaps.
- The design pages, code maps, and statuses match the code, with Implemented evidence.
- The user has run the stage and approved it.

## Dependencies

- [I03-E02-017 — Measure a city day with commits](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-017-measure-a-city-day-with-commits.md)
- [I03-E02-009 — Snapshot tests](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-009-snapshot-tests.md)
- [I03-E02-016 — Gaps, filter, and collapsed runs](../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-016-gaps-filter-and-collapsed-runs.md)
- [I03-E03-015 — Back-office driver accounts and lockout](../../I03-E03-paths-and-commands/High/I03-E03-015-back-office-driver-accounts-and-lockout.md)
- [I03-E04-011 — Eligibility funnel](../../I03-E04-business-rules/High/I03-E04-011-eligibility-funnel.md)
- [I03-E05-006 — Job schedule view](../../I03-E05-push-devices-and-jobs/High/I03-E05-006-job-schedule-view.md)
- [I03-E06-019 — Order criteria check](../../I03-E06-explaining-views/High/I03-E06-019-order-criteria-check.md)
- [I03-E07-008 — Glossary](../../I03-E07-run-tools-and-workspace/High/I03-E07-008-glossary.md)

## Sources and evidence

- [Implementation roadmap](../../../../../design/roadmap/implementation-roadmap.md)
- [Project foundation: FND-34](../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-08 — Dependencies widened: the user chose that the gate also waits for I03-E02-009 and
  I03-E02-016, where Run history's open work ends (FND-81).

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
