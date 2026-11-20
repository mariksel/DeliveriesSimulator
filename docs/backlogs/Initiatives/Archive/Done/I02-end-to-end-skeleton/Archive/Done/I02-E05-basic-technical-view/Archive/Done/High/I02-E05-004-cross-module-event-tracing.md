# I02-E05-004 — Cross-module event tracing

| Field | Value |
| --- | --- |
| ID | `I02-E05-004` |
| Parent | [I02-E05 — Basic technical view](../../../I02-E05-basic-technical-view-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-05 |
| Completed | 2026-11-05 |

## Scope

Cross-module event tracing: follow one action from its command, through the outbox and inbox, to
the other module's records.

### Outcome

- Selecting an event and opening the Trace tab, or pressing Show trace, shows every step of its
  action in both modules, in order, as FND-79 records. Tests check this in three browsers.
- The chain through the selected event is highlighted, and clicking a step selects it.
- During a run the diagram grows, and an outbox write not yet read says `waiting`.
- A selected step uses a blue tint, not the lists' solid blue, so the blue path stays visible
  across its row.
- At a 1280-pixel window a long label beside `waiting` is cut short. Hovering shows it in full.
- Stryker, run once at the end of the epic, scored 84.58% on Domain and Application. It first
  covered the verification code here, as the criteria had no tests of their own. The user asked
  for those tests on 2026-11-05, and with them the score is 93.59%.
- Writing those tests found a bug: stepping ended a run at the first piece of work due at its
  stated end, and left the rest unrun. It is fixed, so a stepped run now matches a headless one.
- The tab is not virtualized, as a trace is one action. A fault-heavy trace with many retries may
  want that later.

## Acceptance criteria

- Selecting an event shows every related step in both modules, in order.

## Dependencies

- [I02-E05-003 — Outbox and inbox inspector](I02-E05-003-outbox-and-inbox-inspector.md)

## Sources and evidence

- [Project foundation: FND-24](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-24--goal-is-correctness)
- [Project foundation: FND-46](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E05-003, is Done.
- 2026-11-05 — Moved from Ready to In Progress, on the user's request.
- 2026-11-05 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
