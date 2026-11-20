# I03-E02-001 — Run history design page

| Field | Value |
| --- | --- |
| ID | `I03-E02-001` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | 2026-11-05 |

## Scope

Turn the answers in FND-81 into a design: the main root and its two sub-roots, state and effect
commits, references, function identity, the repository, saved levels, forks, and timeline views.
It extends the run history page. It also rewords FND-73's saving rule and its statement on event
sourcing, which FND-81 conflicts with.

### Outcome

- The
  [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md#how-a-run-is-held)
  now holds how a run is held, and
  [Run history](../../../../../../../../../design/modules/run-history.md) holds the timeline, forks,
  saved levels, and the repository.
  [Verification](../../../../../../../../../design/modules/verification.md#snapshot-tests) holds
  snapshot tests.
- FND-73 is reworded, and FND-56 is amended, with what stays in force until built listed in
  FND-81. The user confirmed the remaining proposals, in FND-81.
- The module map gained two dependencies, with the user's approval.

## Acceptance criteria

- The design pages state how all of FND-81 works, and FND-81 stays as the record of the
  decisions.
- FND-73, the layers page, and code style no longer conflict with it.
- Each page names its code map, for later items to fill in.

## Dependencies

- [I03-E01-001 — Plan this stage](../../../../../../Archive/Done/I03-E01-stage-planning/Archive/Done/Normal/I03-E01-001-plan-this-stage.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Project foundation: FND-73](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-73--immutable-architecture)
- [Run history](../../../../../../../../../design/modules/run-history.md)
- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)
- [Layers](../../../../../../../../../design/architecture/layers.md)
- [Code style](../../../../../../../../../design/governance/code-style.md)

## Status history

- 2026-11-05 — Created as Ready: the user approved the stage's plan in I03-E01-001, and this
  item can start.
- 2026-11-05 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-05 — Moved from In Progress to Done: the design pages state how FND-81 works, and
  FND-73, the layers page, and code style no longer conflict with it.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
