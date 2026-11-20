# I01-E04-002 — Side-by-side comparison

| Field | Value |
| --- | --- |
| ID | `I01-E04-002` |
| Parent | [I01-E04 — Versioning and comparison](../../../I01-E04-versioning-and-comparison-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Decide what a comparison between versions shows.

### Questions for the user

- Should compared versions run the same scenario with the same seed?
- What gets compared: event traces, decisions, final states, or metrics?
- How many versions can be compared at once?
- Should runs be live side by side, or compared afterwards?
- How are differences in event kinds between versions shown?

### Answers so far

- Inputs, how many, when, and what a comparison shows:
  [FND-51](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-51--comparison).

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E04-001 — What a version is](I01-E04-001-what-a-version-is.md)

## Sources and evidence

- [Project foundation: FND-26](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-26--versions-compared-side-by-side)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependency, I01-E04-001,
  is Done. No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-51. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
