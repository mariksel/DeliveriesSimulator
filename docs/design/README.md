# DeliveriesSimulator Design

This directory contains the versioned design and architecture record for
DeliveriesSimulator. It describes the repository as it exists, approved product
decisions, implementation status, and future work only where an approved plan
exists. It is a navigable document graph: follow links between the system,
architecture, capabilities, UI, data, integrations, decisions, and code.

## Start here

- [System overview](system/overview.md) — purpose, current boundary, actors, and
  system context.
- [Architecture overview](architecture/overview.md) — source structure, layer
  responsibilities, and dependency direction.
- [Requirements](requirements.md) — every approved requirement by area, linked to its record.
- [Capabilities and modules](modules/README.md) — capability map and module documents.
- [UI](ui/README.md) — the application's views and how users move between them.
- [Data](data/persistence.md) — what data is held, where, and how it changes.
- [Integrations](integrations/README.md) — external systems and their boundaries.
- [Versioning](governance/versioning.md) — independent version labels and change
  policy.
- [Code style](governance/code-style.md) — how the code is written, and what checks each rule.
- [Open decisions](governance/open-decisions.md) — known unresolved or
  phase-gated matters; no assumptions are promoted to decisions.

- [Versions](versions/README.md) — the simulated versions of the real service, each with its
  own specification.

Decision records:

- [Project foundation](decisions/project-foundation.md) — purpose, stack, data
  location, integrations, users, capability list, rule sources, and architecture.
- [Implementation roadmap](roadmap/implementation-roadmap.md) — the approved stages `I02` to
  `I11`, and which stage builds each capability.

List each decision record and roadmap here as it is added. New pages start from:
[module](modules/_module-template.md),
[integration](integrations/_integration-template.md),
[decision](decisions/_decision-template.md),
[roadmap](roadmap/_roadmap-template.md).

## Version snapshot

| Version type | Recorded baseline | Meaning |
|---|---|---|
| Design (`D`) | `D0.6.0` | First built baseline, with stage `I02` built: the approved purpose, goal, stack, data location and mechanism, capability list, business rule sources, version comparison, and public safety. |
| Architecture (`A`) | `A0.6.0` | Clean architecture with a framework-free core, five layers, a composition root, a custom Vite build with type checking, Node 26, TypeScript 6.0, an architecture check, code style tools, and test tools. |

These are independent labels. A change to one dimension does not automatically
change another. The labels identify the documented baselines and must not be
interpreted as proof of a deployed or approved product release. See
[versioning](governance/versioning.md).

## Current state and evidence

The source holds the workspace, the simulation core, the first order's path, its scenario and
checks, and a basic technical view. The system overview, UI, and module pages therefore still
mostly record approved intent, not observed behavior;
their code maps show what exists so far. Update them as source arrives.
Product decisions and planned work are taken from
approved records and are linked to their sources.
Implementation status is intentionally distinct from product approval: an
approved workflow may still be unimplemented.

## Document map

```text
Design root
├── System overview
├── Requirements
├── Architecture
│   ├── Overview
│   └── Layer model
├── Capability modules
├── Cross-cutting design
│   ├── UI
│   ├── Data
│   └── Integrations
├── Approved decisions and roadmap
└── Governance
    ├── Document governance
    ├── Versioning
    └── Open decisions
```

The module graph is indexed in [modules](modules/README.md). Pages link to their
related concepts and relevant source files; repository paths are relative to the
repository root unless stated otherwise.
