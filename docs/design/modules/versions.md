# Versions

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a module in
  [FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries). Not implemented: no
  source exists. The [implementation roadmap](../roadmap/implementation-roadmap.md) says which
  stage builds it.

## Current and approved responsibilities

Owns the simulated versions of the real service: their kinds, numbers, and lifecycle, their option
switches, the comparison of versions side by side, and the conformance exchange with the real
service. The versions themselves are specified in [versions](../versions/README.md).

## Key approved business rules

- What a version is, its numbers, and its lifecycle:
  [FND-40](../decisions/project-foundation.md#fnd-40--kinds-of-version) to
  [FND-44](../decisions/project-foundation.md#fnd-44--version-lifecycle).
- Comparison: [FND-51](../decisions/project-foundation.md#fnd-51--comparison).
- Conformance exchange: [FND-52](../decisions/project-foundation.md#fnd-52--conformance-exchange).
- Tuned setups as what-if variations:
  [FND-54](../decisions/project-foundation.md#fnd-54--tunability).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Business rules](business-rules.md) (rules per version), [Scenarios](scenarios.md)
  (runs to compare), and [Run history](run-history.md) (stored runs).
- **Used by:** [Verification](verification.md) (the rules checked), [Analysis](analysis.md)
  (values to vary), [Scenarios](scenarios.md) (picks the version and switches), and
  [Import and export](import-and-export.md) (version files).

## Code map

| Path | Purpose |
|---|---|
| `src/domain/versions/version-id.ts` | `VersionId`, a version's ID, which a scenario names. Nothing else of the module exists yet |
