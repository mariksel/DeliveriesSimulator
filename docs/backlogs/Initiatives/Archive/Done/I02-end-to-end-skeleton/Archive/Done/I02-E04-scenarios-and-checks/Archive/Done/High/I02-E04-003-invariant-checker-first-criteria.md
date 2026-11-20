# I02-E04-003 — Invariant checker, first criteria

| Field | Value |
| --- | --- |
| ID | `I02-E04-003` |
| Parent | [I02-E04 — Scenarios and checks](../../../I02-E04-scenarios-and-checks-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The Invariant checker with four criteria: Valid final state, Modules agree, Exactly-once effect,
and Outbox for every event. It also adds the Simulator self-tests, which prove that each check
can fail.

### Outcome

- The checker judges a run on Valid final state, Modules agree, Exactly-once effect, and Outbox for
  every event, from its event log alone, and links each violation to the log entry that shows it.
- The happy path passes all four.
- `npm run self-test` takes a known good run, and breaks its log in 13 ways across the four
  criteria. The checker reports each one.
- The checker is not yet part of running a scenario, so neither the browser nor the command line
  says pass or fail. I02-E04-004 connects them.
- FND-75 records how the criteria are judged, which the user has not reviewed separately.

## Acceptance criteria

- Each criterion passes on the happy path.
- A self-test breaks each criterion on purpose, and the check reports it.
- The checker reads the run from the event log alone. This moved here from I02-E02-003.

## Dependencies

- [I02-E07-003 — Snapshots and performance benchmark](../../../../I02-E07-style-and-immutable-rework/Archive/Done/High/I02-E07-003-snapshots-and-performance-benchmark.md)
- [I02-E04-002 — Runner, browser and headless](I02-E04-002-runner-browser-and-headless.md)

## Sources and evidence

- [Project foundation: FND-29](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-29--business-correctness)
- [Project foundation: FND-30](../../../../../../../../../../../design/decisions/project-foundation/correctness-and-success.md#fnd-30--technical-correctness)
- [Project foundation: FND-60](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-60--implementation-stages)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E04-002, is Done.
- 2026-11-04 — Moved from Ready to Proposed: it now waits for the immutable rework, I02-E07-003,
  by the user's decision.
- 2026-11-04 — Moved from Proposed to Ready: its dependencies are Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started the item.
- 2026-11-04 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
