# Technical view

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Partly implemented: the event
  list, the Payload viewer, the Outbox and inbox inspector
  ([FND-77](../decisions/project-foundation.md#fnd-77--event-list-and-payload-viewer)), and
  Cross-module event tracing
  ([FND-79](../decisions/project-foundation.md#fnd-79--cross-module-event-tracing)). The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds the rest.

## Current and approved responsibilities

Shows the simulation in technical terms, such as states and events, down to records, messages,
jobs, and service instances. Its capabilities are listed in
[capability ownership](capability-ownership.md).

## Key approved business rules

- A view of its own; the detail-level switch moves to the business view for the same run,
  moment, and selection ([FND-53](../decisions/project-foundation.md#fnd-53--ui-organisation)).
- The technical correctness criteria
  ([FND-30](../decisions/project-foundation.md#fnd-30--technical-correctness)).
- Full technical detail is visible
  ([FND-46](../decisions/project-foundation.md#fnd-46--simulation-detail)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Event log](event-log.md) (reads), and [Simulation engine](simulation-engine.md)
  (instances and jobs).
- **Used by:** no other module.
- [UI](../ui/README.md) describes where it fits in the application.

## Code map

| Path | Purpose |
| --- | --- |
| `src/ui/technical-view/event-list/` | The event list, from the log alone, each event with a dot that pauses the run at its kind ([FND-88](../decisions/project-foundation.md#fnd-88--step-debugger)) |
| `src/ui/technical-view/payload-viewer/` | The Payload viewer |
| `src/ui/technical-view/outbox-inbox-inspector/` | The Outbox and inbox inspector, from the log alone |
| `src/ui/technical-view/inspector-table/` | One of its tables |
| `src/ui/technical-view/inspector-views.ts` | What the inspector shows, as tested pure functions |
| `src/ui/technical-view/column-headings/` | Table headings with resizable columns |
| `src/ui/technical-view/column-widths.ts` | Column widths, as tested pure functions |
| `src/ui/technical-view/column-width-store.ts` | Holds resized widths while the app stays open |
| `src/ui/technical-view/trace-diagram/` | The trace's sequence diagram |
| `src/ui/technical-view/trace-views.ts` | What the trace shows and draws, as tested pure functions |
| `src/ui/technical-view/event-views.ts` | What each shows for an entry, as tested pure functions |
| `src/application-core/technical-view/text-copier.ts` | The abstraction for copying text |
| `src/infrastructure/technical-view/browser-text-copier.ts` | Its browser implementation |
