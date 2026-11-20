# I01-E06-002 — Create implementation initiatives

| Field | Value |
| --- | --- |
| ID | `I01-E06-002` |
| Parent | [I01-E06 — Implementation backlog](../../../I01-E06-implementation-backlog-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Define the delivery stages and create the implementation initiatives from `I02` onward. FND-27
sets coverage as everything, delivered in stages.

### Questions for the user

- What order should the stages go in, and what comes first?
- What must each stage demonstrate before the next one starts?
- Is the proposed split into initiatives and epics right?
- Which FND-34 capabilities matter most, and belong in the first stage? The user moved this
  question here from I01-E01-002 on 2026-11-03.
- When are the FND-35 later capabilities built?

### Answers so far

- The first stage and the stage gate:
  [FND-60](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-60--implementation-stages).
- The order, backlog detail, later capabilities, and which stage builds each capability: FND-60
  and the
  [implementation roadmap](../../../../../../../../../../../design/roadmap/implementation-roadmap.md),
  approved stage by stage.
- The `I02` split, the first four criteria, the planning items for `I03` to `I11`, their intended
  epics, and the priorities: FND-60 and the roadmap. The Outbox for every event criterion was
  widened in FND-30, after a check against `V1.0.0`.

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E06-001 — Consolidate and approve requirements](I01-E06-001-consolidate-and-approve-requirements.md)

## Sources and evidence

- [Project foundation: FND-27](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-27--covered-in-stages)
- [Project foundation: FND-28](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-28--backlog-first)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready: its dependency, I01-E06-001, is Done.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  in FND-60 and the implementation roadmap, and I02 to I11 exist. Archived under
  `Archive/Done/High/`; its epic and I01 are archived with it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
