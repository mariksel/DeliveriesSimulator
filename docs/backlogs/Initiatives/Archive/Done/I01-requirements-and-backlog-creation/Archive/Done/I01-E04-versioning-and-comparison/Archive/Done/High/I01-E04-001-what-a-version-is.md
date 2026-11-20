# I01-E04-001 — What a version is

| Field | Value |
| --- | --- |
| ID | `I01-E04-001` |
| Parent | [I01-E04 — Versioning and comparison](../../../I01-E04-versioning-and-comparison-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Define what a version is and how new ones get created as the real service changes.

### Questions for the user

- Is a version a snapshot of the real service, a set of design decisions, or a named variation?
- Which versions come first?
- Can a version represent a design that is not built yet?
- How much can differ between versions: values, rules, event kinds, or the whole flow?
- Who creates a new version, and what triggers it?
- How long do old versions stay supported?
- U10: which module owns versions and comparison? FND-8 has no such capability.

### Answers so far

- What a version is: one of five kinds,
  [FND-40](../../../../../../../../../../../design/decisions/project-foundation/versions.md#fnd-40--kinds-of-version).
  A version can represent a design that is not built yet.
- Naming: `V` and SemVer by the size of the change,
  [FND-41](../../../../../../../../../../../design/decisions/project-foundation/versions.md#fnd-41--version-numbers).
- First versions: built today, planned dispatch, and the module copies design,
  [FND-42](../../../../../../../../../../../design/decisions/project-foundation/versions.md#fnd-42--first-versions).
- Pre-release tags for unbuilt versions, and the first version numbers:
  [FND-42](../../../../../../../../../../../design/decisions/project-foundation/versions.md#fnd-42--first-versions).
- Who creates versions, what triggers one, and how long they stay supported:
  [FND-44](../../../../../../../../../../../design/decisions/project-foundation/versions.md#fnd-44--version-lifecycle).
- What may differ: values, rules, events and payloads, and the flow and modules,
  [FND-43](../../../../../../../../../../../design/decisions/project-foundation/versions.md#fnd-43--what-may-differ-between-versions).
- U10, which module owns versions and comparison: moved to I01-E03-006 by the user on
  2026-11-03, with the other module ownership questions.

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-001 — Confirm purpose and success](../../../../I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)

## Sources and evidence

- [Project foundation: FND-26](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-26--versions-compared-side-by-side)
- [Project foundation: Undecided items](../../../../../../../../../../../design/decisions/project-foundation.md#undecided)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to Ready on the user's approval: its dependency, I01-E01-001,
  is Done. No work started.
- 2026-11-03 — Moved from Ready to In Progress: the user started it ahead of I01-E02-001, which
  needs version names.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  and recorded in FND-40 to FND-44, and U10 moved to I01-E03-006. Archived under
  `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
