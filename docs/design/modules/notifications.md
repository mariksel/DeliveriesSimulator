# Notifications

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Not implemented: no source
  exists. The [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage
  builds it.

## Current and approved responsibilities

Simulated notifications to drivers and restaurants, and the push pipeline and devices that
deliver them, as the real service would send them
([FND-46](../decisions/project-foundation.md#fnd-46--simulation-detail)).

## Key approved business rules

- The push pipeline: sending, retries, invalid devices, and callbacks; and the device model:
  offline, in the background, and receiving duplicates
  ([FND-46](../decisions/project-foundation.md#fnd-46--simulation-detail)).
- No real notification provider is called
  ([FND-33](../decisions/project-foundation.md#fnd-33--out-of-scope)).
- Each version's pushes, starting with
  [V1.0.0 module communication](../versions/V1.0.0/module-communication.md), with the planned
  dispatch notifications in
  [V1.1.0-planned-dispatch events](../versions/V1.1.0-planned-dispatch/events.md).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Drivers](drivers.md) (drivers' devices), and
  [Restaurants](restaurants.md) (restaurants' devices).
- **Used by:** [Fault injection](fault-injection.md) (breaks steps),
  [Simulation engine](simulation-engine.md) (drives), [Orders](orders.md) (restaurant pushes), and
  [Drivers](drivers.md) (driver pushes).

## Code map

No source exists yet. Add paths here when code is added.
