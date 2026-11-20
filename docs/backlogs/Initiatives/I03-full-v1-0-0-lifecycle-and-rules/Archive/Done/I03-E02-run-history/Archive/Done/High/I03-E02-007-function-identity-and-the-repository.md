# I03-E02-007 — Function identity and the repository

| Field | Value |
| --- | --- |
| ID | `I03-E02-007` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-06 |
| Completed | 2026-11-06 |

## Scope

A state commit holds a direct reference to its function. A repository owns the mapping from
static functions to stored IDs, such as `orders.pick-up@1`, and from every persisted record to
its application record, so functions can be renamed and application records are never stored
directly. Any behaviour change adds a new version.

## Acceptance criteria

- Renaming a function changes no stored data.
- Nothing in Domain knows about stored IDs.
- Every persisted record has its own type and mapping, and a test shows each one maps back
  exactly.

## Dependencies

- [I03-E02-006 — Simulator data worked out](I03-E02-006-simulator-data-worked-out.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Project foundation: FND-57](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-57--hosting-and-data)
- [Layers](../../../../../../../../../design/architecture/layers.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-06 — Moved from Proposed to Ready: its dependency I03-E02-006 is Done.
- 2026-11-06 — Moved from Ready to In Progress: the user chose it as the next item, and settled
  the repository's first job, the version guard, arguments from the parent root, and the
  `Persisted` naming, in FND-81.
- 2026-11-06 — Moved from In Progress to Done: each state commit holds its function and
  arguments, and the repository maps a run to persisted records and back, exactly, with stored
  function IDs and a pinned fingerprint for each. Domain holds no stored ID, and npm run check
  passes.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
