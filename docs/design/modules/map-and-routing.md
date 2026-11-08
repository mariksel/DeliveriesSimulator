# Map and routing

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Partly implemented:
  straight-line distance exists. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds it.

## Current and approved responsibilities

The delivery area, distances, and routes, in a synthetic city that the simulator draws itself
([FND-48](../decisions/project-foundation.md#fnd-48--simulation-model)). It owns custom cities
([FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files)).

## Key approved business rules

- A synthetic city generated from a seed and settings, editable by hand; drivers move along its
  streets ([FND-48](../decisions/project-foundation.md#fnd-48--simulation-model)).
- Travel times are generated: street-level traffic and live routing providers are not used
  ([FND-33](../decisions/project-foundation.md#fnd-33--out-of-scope)).
- Routing provider failures can be injected
  ([FND-47](../decisions/project-foundation.md#fnd-47--failures)).
- Custom cities are stored records, shared inside the scenarios that use them
  ([FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** no other module.
- **Used by:** [Business view](business-view.md) (heatmaps), [Scenarios](scenarios.md) (the
  city), [Fault injection](fault-injection.md) (provider failures),
  [Simulation engine](simulation-engine.md) (moves drivers),
  [Restaurants](restaurants.md) (where they are), and
  [Drivers](drivers.md) (distances).

## Code map

| Path | Purpose |
|---|---|
| `src/domain/map-and-routing/coordinates.ts` | A place, as a class that checks its latitude and longitude, and the straight-line distance between two |
| `src/domain/map-and-routing/area-id.ts` | `AreaId`, a delivery area's ID, in a file of its own until areas have a class |
| `src/domain/map-and-routing/numbers.ts` | `Metres` and `Degrees`, branded numbers made by creators that check them |
