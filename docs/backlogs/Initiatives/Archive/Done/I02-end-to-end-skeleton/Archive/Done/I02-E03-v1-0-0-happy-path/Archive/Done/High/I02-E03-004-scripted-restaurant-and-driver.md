# I02-E03-004 — Scripted restaurant and driver

| Field | Value |
| --- | --- |
| ID | `I02-E03-004` |
| Parent | [I02-E03 — V1.0.0 happy path](../../../I02-E03-v1-0-0-happy-path-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The restaurant and the driver act from a scenario's steps, through the commands of `V1.0.0`.
Behaviour profiles come in `I07`.

### Outcome

- A list of steps now drives every action on the path, by its stated actor, at its stated time, and
  takes one order to delivered. A step that is refused is logged, and the next one still runs.
- The steps are a plain list for now. I02-E04-001 gives them a format that a person can read.
- Building this broke the confirmed module graph three times, unnoticed, so the architecture check
  now enforces the graph. It forbade 7 planted imports and allowed 7 others.
- Decisions:
  [FND-69](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-69--module-jobs-and-the-module-graph-check).

## Acceptance criteria

- A scenario's steps drive every action on the path, at the times they state.

## Dependencies

- [I02-E03-003 — Outboxes and inboxes, both ways](I02-E03-003-outboxes-and-inboxes-both-ways.md)

## Sources and evidence

- [Project foundation: FND-46](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail)
- [Project foundation: FND-49](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)
- [V1.0.0 actors and commands](../../../../../../../../../../../design/versions/V1.0.0/actors-and-commands.md)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E03-003, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: its acceptance criterion
  is met, as the outcome records. Archived under `Archive/Done/High/`; its epic is archived with
  it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
