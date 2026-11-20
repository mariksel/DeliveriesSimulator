# Initiative I02 — End-to-end skeleton

| Field | Value |
| --- | --- |
| ID | `I02` |
| Status | Done |
| Priority | High |
| Created | 2026-11-03 |
| Last updated | 2026-11-05 |
| Completed | 2026-11-05 |

Sets up the project and takes one `V1.0.0` order from end to end, without faults, with a
scenario that passes or fails. It is the first stage of the
[implementation roadmap](../../../../../design/roadmap/implementation-roadmap.md) and ends at the
stage gate of FND-60.

Linked design and decision documents remain authoritative for product rules and
architecture; the backlog is canonical for work lifecycle.

## Initiative summary

- **Non-archived**
  - No non-archived epics.
- **Archived**
  - [I02-E05 — Basic technical view](Archive/Done/I02-E05-basic-technical-view/I02-E05-basic-technical-view-backlog.md) — Archived — Done — Last updated: 2026-11-05 — Priority: High
    - [I02-E05-004 — Cross-module event tracing](Archive/Done/I02-E05-basic-technical-view/Archive/Done/High/I02-E05-004-cross-module-event-tracing.md) — Archived — Done — Last updated: 2026-11-05 — Priority: High
    - [I02-E05-001 — App shell, run controls, and status bar](Archive/Done/I02-E05-basic-technical-view/Archive/Done/High/I02-E05-001-app-shell-run-controls-and-status-bar.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E05-002 — Event list and payload viewer](Archive/Done/I02-E05-basic-technical-view/Archive/Done/High/I02-E05-002-event-list-and-payload-viewer.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E05-003 — Outbox and inbox inspector](Archive/Done/I02-E05-basic-technical-view/Archive/Done/High/I02-E05-003-outbox-and-inbox-inspector.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
  - [I02-E06 — Stage gate](Archive/Done/I02-E06-stage-gate/I02-E06-stage-gate-backlog.md) — Archived — Done — Last updated: 2026-11-05 — Priority: High
    - [I02-E06-001 — I02 stage gate](Archive/Done/I02-E06-stage-gate/Archive/Done/High/I02-E06-001-i02-stage-gate.md) — Archived — Done — Last updated: 2026-11-05 — Priority: High
  - [I02-E01 — Project foundation](Archive/Done/I02-E01-project-foundation/I02-E01-project-foundation-backlog.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E01-003 — Test tools and public-safety check](Archive/Done/I02-E01-project-foundation/Archive/Done/High/I02-E01-003-test-tools-and-public-safety-check.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E01-001 — Angular 22 and Vite 8 workspace](Archive/Done/I02-E01-project-foundation/Archive/Done/High/I02-E01-001-angular-22-and-vite-8-workspace.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
    - [I02-E01-002 — Layers, composition root, and architecture checks](Archive/Done/I02-E01-project-foundation/Archive/Done/High/I02-E01-002-layers-composition-root-and-architecture-checks.md) — Archived — Done — Last updated: 2026-11-03 — Priority: High
  - [I02-E02 — Simulation core](Archive/Done/I02-E02-simulation-core/I02-E02-simulation-core-backlog.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E02-001 — Virtual clock and scheduler](Archive/Done/I02-E02-simulation-core/Archive/Done/High/I02-E02-001-virtual-clock-and-scheduler.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E02-002 — Seeded randomness and determinism check](Archive/Done/I02-E02-simulation-core/Archive/Done/High/I02-E02-002-seeded-randomness-and-determinism-check.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E02-003 — Event log](Archive/Done/I02-E02-simulation-core/Archive/Done/High/I02-E02-003-event-log.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
  - [I02-E03 — V1.0.0 happy path](Archive/Done/I02-E03-v1-0-0-happy-path/I02-E03-v1-0-0-happy-path-backlog.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E03-001 — Orders module path](Archive/Done/I02-E03-v1-0-0-happy-path/Archive/Done/High/I02-E03-001-orders-module-path.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E03-002 — Deliveries module path](Archive/Done/I02-E03-v1-0-0-happy-path/Archive/Done/High/I02-E03-002-deliveries-module-path.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E03-003 — Outboxes and inboxes, both ways](Archive/Done/I02-E03-v1-0-0-happy-path/Archive/Done/High/I02-E03-003-outboxes-and-inboxes-both-ways.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E03-004 — Scripted restaurant and driver](Archive/Done/I02-E03-v1-0-0-happy-path/Archive/Done/High/I02-E03-004-scripted-restaurant-and-driver.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
  - [I02-E04 — Scenarios and checks](Archive/Done/I02-E04-scenarios-and-checks/I02-E04-scenarios-and-checks-backlog.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E04-001 — Scenario format and validation](Archive/Done/I02-E04-scenarios-and-checks/Archive/Done/High/I02-E04-001-scenario-format-and-validation.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E04-002 — Runner, browser and headless](Archive/Done/I02-E04-scenarios-and-checks/Archive/Done/High/I02-E04-002-runner-browser-and-headless.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E04-003 — Invariant checker, first criteria](Archive/Done/I02-E04-scenarios-and-checks/Archive/Done/High/I02-E04-003-invariant-checker-first-criteria.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E04-004 — First built-in scenario](Archive/Done/I02-E04-scenarios-and-checks/Archive/Done/High/I02-E04-004-first-built-in-scenario.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
  - [I02-E07 — Style and immutable rework](Archive/Done/I02-E07-style-and-immutable-rework/I02-E07-style-and-immutable-rework-backlog.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E07-001 — Apply the code style rules](Archive/Done/I02-E07-style-and-immutable-rework/Archive/Done/High/I02-E07-001-apply-the-code-style-rules.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E07-002 — Immutable run state](Archive/Done/I02-E07-style-and-immutable-rework/Archive/Done/High/I02-E07-002-immutable-run-state.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High
    - [I02-E07-003 — Snapshots and performance benchmark](Archive/Done/I02-E07-style-and-immutable-rework/Archive/Done/High/I02-E07-003-snapshots-and-performance-benchmark.md) — Archived — Done — Last updated: 2026-11-04 — Priority: High

## Archive

- [Epic archive](Archive/I02-end-to-end-skeleton-archive-index.md)
