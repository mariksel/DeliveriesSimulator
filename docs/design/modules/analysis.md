# Analysis

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a module in
  [FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries). Not implemented: no
  source exists. The [implementation roadmap](../roadmap/implementation-roadmap.md) says which
  stage builds it.

## Current and approved responsibilities

Works across many runs: parameter sweeps, statistics across seeds, sensitivity and optimisation,
outliers and hotspots, and the offline dispatch model. Its capabilities are listed in
[capability ownership](capability-ownership.md).

## Key approved business rules

- The offline dispatch model:
  [FND-55](../decisions/project-foundation.md#fnd-55--offline-dispatch-model).
- Tunable values and presets: [FND-54](../decisions/project-foundation.md#fnd-54--tunability).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Simulation engine](simulation-engine.md) (many runs), [Run history](run-history.md)
  (stored runs), [Scenarios](scenarios.md) (inputs), and [Versions](versions.md) (values to
  vary).
- **Used by:** no other module.

## Code map

No source exists yet. Add paths here when code is added.
