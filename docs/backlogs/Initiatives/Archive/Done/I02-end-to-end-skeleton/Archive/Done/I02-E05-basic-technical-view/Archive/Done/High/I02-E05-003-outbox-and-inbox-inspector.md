# I02-E05-003 — Outbox and inbox inspector

| Field | Value |
| --- | --- |
| ID | `I02-E05-003` |
| Parent | [I02-E05 — Basic technical view](../../../I02-E05-basic-technical-view-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The Outbox and inbox inspector: each module's outbox and inbox records during a run.

### Outcome

- At any moment of a run, the inspector shows which events each module has written and read, and
  what is still waiting, from the log alone. Tests check this mid-run, by stepping, in three
  browsers.
- It has the two views the user asked for, by flow and by module, with a toggle that stays as
  chosen.
- Each row shows the event, its kind and order, its times, and how long it waited. A row selects
  its outbox entry, and its read time links to the inbox read.
- By module, four tables share the width, so at a 1280-pixel window long kinds and IDs are cut
  short. Hovering shows them in full, and narrowing the detail panel gives them more room.
- Repeating the browser tests found a bug in the event list from I02-E05-002: at high speed, a
  click on a row could be lost, because the row moved between press and release. Following now
  stops on the press, FND-77 says so, and a test checks it.
- Retry records wait for retries, which arrive with I04, as FND-78 notes.
- The tables do not follow the newest row as the event list does. Nothing asked for it, and a long
  run may want it.

## Acceptance criteria

- At any moment of a run, the inspector shows which events each module has written and read.

## Dependencies

- [I02-E05-002 — Event list and payload viewer](I02-E05-002-event-list-and-payload-viewer.md)
- [I02-E03-003 — Outboxes and inboxes, both ways](../../../../I02-E03-v1-0-0-happy-path/Archive/Done/High/I02-E03-003-outboxes-and-inboxes-both-ways.md)

## Sources and evidence

- [Project foundation: FND-46](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependencies are Done.
- 2026-11-04 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-04 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
