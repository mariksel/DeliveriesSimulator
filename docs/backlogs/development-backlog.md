# Development Backlog

This is the starting point for understanding the project's past, present, and
planned work. The Markdown backlog is the canonical source for work status.
Product and architecture decisions remain authoritative in the linked design and
decision documents; a backlog status does not approve a decision.

## Start here

- [Backlog system and maintenance rules](system/backlog-system-guide.md)
- [Initiatives index](Initiatives/initiatives-index.md)
- [Design index](../design/README.md)

Use the initiative and epic backlog indexes to navigate the work graph. Item
documents link to their source plans, decisions, dependencies, evidence, and
aliases. A legacy ID may point to more than one canonical item; follow the alias
links rather than treating it as a duplicate task.

## Reading the project state

- **Past:** inspect archived epics under each initiative's `Archive/` branches,
  archived initiatives under `Initiatives/Archive/`, and item archives under each
  epic.
- **Present:** inspect active priority folders (`Critical`, `High`, `Normal`,
  `Low`) and each item's lifecycle status and status history.
- **Future:** inspect `Proposed`, `Ready`, and `Blocked` items. Follow linked
  decisions to distinguish approved scope from unresolved details.

Priority is mutable and is not part of an item's ID. Initiative/epic directories
and item files use ID-plus-succinct-title-slug names; IDs remain authoritative
if a title slug changes. Component-named Markdown indexes summarize the state
and child documents at each level. Manual link and ID checks are part of backlog
maintenance; see the [system guide](system/backlog-system-guide.md#manual-validation).

## Initiatives

- [I01 — Requirements and backlog creation](Initiatives/Archive/Done/I01-requirements-and-backlog-creation/I01-requirements-and-backlog-creation-backlog.md)
- [I02 — End-to-end skeleton](Initiatives/Archive/Done/I02-end-to-end-skeleton/I02-end-to-end-skeleton-backlog.md)
- [I03 — Full V1.0.0 lifecycle and rules](Initiatives/I03-full-v1-0-0-lifecycle-and-rules/I03-full-v1-0-0-lifecycle-and-rules-backlog.md)
- [I04 — Faults, races, and verification](Initiatives/I04-faults-races-and-verification/I04-faults-races-and-verification-backlog.md)
- [I05 — Stored runs and files](Initiatives/I05-stored-runs-and-files/I05-stored-runs-and-files-backlog.md)
- [I06 — Versions and comparison](Initiatives/I06-versions-and-comparison/I06-versions-and-comparison-backlog.md)
- [I07 — City, actors, and scale](Initiatives/I07-city-actors-and-scale/I07-city-actors-and-scale-backlog.md)
- [I08 — Analysis and offline dispatch](Initiatives/I08-analysis-and-offline-dispatch/I08-analysis-and-offline-dispatch-backlog.md)
- [I09 — Conformance exchange](Initiatives/I09-conformance-exchange/I09-conformance-exchange-backlog.md)
- [I10 — Remaining views and checks](Initiatives/I10-remaining-views-and-checks/I10-remaining-views-and-checks-backlog.md)
- [I11 — Later capabilities](Initiatives/I11-later-capabilities/I11-later-capabilities-backlog.md)
