# I02-E05-002 — Event list and payload viewer

| Field | Value |
| --- | --- |
| ID | `I02-E05-002` |
| Parent | [I02-E05 — Basic technical view](../../../I02-E05-basic-technical-view-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

A list of the run's events from the log, and the Payload viewer.

### Outcome

- The timeline region lists every entry of a run's log, read from the log alone, and follows the
  newest while the run goes. Virtual scrolling keeps long runs light.
- Selecting an entry shows its full payload in the detail panel, which now has Event and Verdict
  tabs. Caused by and Trace are links, and Copy puts the data on the clipboard.
- FND-77 records the user's decisions. The clipboard sits in Infrastructure, behind `TextCopier`.
- The time format moved from Scenarios to the simulation engine, because the module map lets
  Technical view use the engine and not Scenarios.
- Tests in three browsers found two real bugs, now fixed: the list stopped following before a run's
  end, and showing the Follow button changed the list's height.

## Acceptance criteria

- Selecting an event shows its full payload.
- The view reads the run from the event log alone. This moved here from I02-E02-003.

## Dependencies

- [I02-E05-001 — App shell, run controls, and status bar](I02-E05-001-app-shell-run-controls-and-status-bar.md)
- [I02-E02-003 — Event log](../../../../I02-E02-simulation-core/Archive/Done/High/I02-E02-003-event-log.md)

## Sources and evidence

- [Project foundation: FND-46](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail)
- [Project foundation: FND-53](../../../../../../../../../../../design/decisions/project-foundation/ui.md#fnd-53--ui-organisation)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependencies are Done.
- 2026-11-04 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-04 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
