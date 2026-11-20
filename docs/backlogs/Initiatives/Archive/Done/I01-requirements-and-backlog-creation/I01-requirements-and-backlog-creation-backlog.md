# Initiative I01 — Requirements and backlog creation

| Field | Value |
| --- | --- |
| ID | `I01` |
| Status | Done |
| Priority | High |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

Gathers the simulator's requirements from the user and creates the later implementation
initiatives, as
[FND-28](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-28--backlog-first)
sets out. Requirements come from asking the user, not from assumptions. This initiative delivers
no simulator code. It is complete when the requirements are approved and the implementation
initiatives exist.

Linked design and decision documents remain authoritative for product rules and
architecture; the backlog is canonical for work lifecycle.

## Initiative summary

- **Non-archived**
  - No non-archived epics.
- **Archived**
  - [I01-E01 — Vision and scope](Archive/Done/I01-E01-vision-and-scope/I01-E01-vision-and-scope-backlog.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E01-001 — Confirm purpose and success](Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E01-002 — Decide candidate capabilities](Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-002-decide-candidate-capabilities.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
  - [I01-E02 — Delivery domain inventory](Archive/Done/I01-E02-delivery-domain-inventory/I01-E02-delivery-domain-inventory-backlog.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E02-001 — Flows, states, actors, and events](Archive/Done/I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-001-flows-states-actors-and-events.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E02-002 — Business decisions](Archive/Done/I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-002-business-decisions.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E02-003 — Technical decisions and event communication](Archive/Done/I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-003-technical-decisions-and-event-communication.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E02-004 — Failure modes, races, and drift](Archive/Done/I01-E02-delivery-domain-inventory/Archive/Done/High/I01-E02-004-failure-modes-races-and-drift.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
  - [I01-E03 — Simulator behaviour](Archive/Done/I01-E03-simulator-behaviour/I01-E03-simulator-behaviour-backlog.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E03-001 — Simulation model](Archive/Done/I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-001-simulation-model.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E03-002 — Visibility and screens](Archive/Done/I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-002-visibility-and-screens.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E03-003 — Tunability](Archive/Done/I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-003-tunability.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E03-004 — Scenario runner and correctness checks](Archive/Done/I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-004-scenario-runner-and-correctness-checks.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E03-005 — Offline dispatch model](Archive/Done/I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-005-offline-dispatch-model.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E03-006 — Module boundaries and dependencies](Archive/Done/I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-006-module-boundaries-and-dependencies.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
  - [I01-E04 — Versioning and comparison](Archive/Done/I01-E04-versioning-and-comparison/I01-E04-versioning-and-comparison-backlog.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E04-001 — What a version is](Archive/Done/I01-E04-versioning-and-comparison/Archive/Done/High/I01-E04-001-what-a-version-is.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E04-002 — Side-by-side comparison](Archive/Done/I01-E04-versioning-and-comparison/Archive/Done/High/I01-E04-002-side-by-side-comparison.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E04-003 — Keeping versions true to the real service](Archive/Done/I01-E04-versioning-and-comparison/Archive/Done/High/I01-E04-003-keeping-versions-true-to-the-real-service.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
  - [I01-E05 — Hosting and data](Archive/Done/I01-E05-hosting-and-data/I01-E05-hosting-and-data-backlog.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E05-001 — Hosting, browsers, and data](Archive/Done/I01-E05-hosting-and-data/Archive/Done/High/I01-E05-001-hosting-browsers-and-data.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
  - [I01-E06 — Implementation backlog](Archive/Done/I01-E06-implementation-backlog/I01-E06-implementation-backlog-backlog.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E06-001 — Consolidate and approve requirements](Archive/Done/I01-E06-implementation-backlog/Archive/Done/High/I01-E06-001-consolidate-and-approve-requirements.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I01-E06-002 — Create implementation initiatives](Archive/Done/I01-E06-implementation-backlog/Archive/Done/High/I01-E06-002-create-implementation-initiatives.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High

## Archive

- [Epic archive](Archive/I01-requirements-and-backlog-creation-archive-index.md)
