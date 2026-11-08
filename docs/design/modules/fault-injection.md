# Fault injection

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Not implemented: no source
  exists. The [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage
  builds it.

## Current and approved responsibilities

Simulates failures such as delays, outages, and failed deliveries, for developers and
QA.

## Key approved business rules

- Simulated failures are ordinary simulation events, not application errors
  ([FND-22](../decisions/project-foundation.md#fnd-22--error-reporting)).
- Which failures matter, and how they are produced: by hand, at random, and explored
  systematically ([FND-47](../decisions/project-foundation.md#fnd-47--failures)).
- Each version's known races and give-ups, starting with
  [V1.0.0 failures](../versions/V1.0.0/failures.md).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Orders](orders.md) (breaks steps), [Drivers](drivers.md) (breaks steps),
  [Payments](payments.md) (breaks steps), [Notifications](notifications.md) (breaks steps),
  [Map and routing](map-and-routing.md) (provider failures), and
  [Simulation engine](simulation-engine.md) (skews clocks).
- **Used by:** [Simulation engine](simulation-engine.md) (applies faults).
- It can reach every step: saving data, calling the other module or a provider, running a job,
  sending a message, and clocks and devices
  ([FND-47](../decisions/project-foundation.md#fnd-47--failures)).

## Code map

No source exists yet. Add paths here when code is added.
