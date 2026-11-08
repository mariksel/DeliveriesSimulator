# Import and export

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Not implemented: no source
  exists. The [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage
  builds it.

## Current and approved responsibilities

Shares scenarios, versions, tuning presets, and stored runs as files, since browser storage
stays on one machine. A scenario file carries the cities and profiles it uses. Results are not
exported as data for other tools; the conformance exchange, owned by [Versions](versions.md), is
the one exception ([FND-33](../decisions/project-foundation.md#fnd-33--out-of-scope),
[FND-52](../decisions/project-foundation.md#fnd-52--conformance-exchange),
[FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files)).

## Key approved business rules

- Everything is shared between people as files
  ([FND-57](../decisions/project-foundation.md#fnd-57--hosting-and-data)).
- Scenarios are JSON, in a documented format that people can read
  ([FND-49](../decisions/project-foundation.md#fnd-49--scenarios)).
- Run files open only in the simulator
  ([FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Scenarios](scenarios.md) (scenario files), [Versions](versions.md) (version files),
  and [Run history](run-history.md) (run files).
- **Used by:** no other module.

## Code map

No source exists yet. Add paths here when code is added.
