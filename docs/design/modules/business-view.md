# Business view

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Not implemented: no source
  exists. The [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage
  builds it.

## Current and approved responsibilities

Shows the simulation in business terms, such as rules and outcomes: orders, drivers, restaurants,
cash, and business metrics. Its capabilities are listed in
[capability ownership](capability-ownership.md).

## Key approved business rules

- A view of its own; the detail-level switch moves to the technical view for the same run,
  moment, and selection ([FND-53](../decisions/project-foundation.md#fnd-53--ui-organisation)).
- The business correctness criteria
  ([FND-29](../decisions/project-foundation.md#fnd-29--business-correctness)).
- It does not provide a price and fee breakdown, role layouts, or business-language explanations
  of technical events ([FND-33](../decisions/project-foundation.md#fnd-33--out-of-scope)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Event log](event-log.md) (reads), [Orders](orders.md) (order states),
  [Drivers](drivers.md) (drivers and dispatch), [Payments](payments.md) (cash),
  [Restaurants](restaurants.md) (restaurants and customers), and
  [Map and routing](map-and-routing.md) (heatmaps).
- **Used by:** no other module.
- [UI](../ui/README.md) describes where it fits in the application.

## Code map

No source exists yet. Add paths here when code is added.
