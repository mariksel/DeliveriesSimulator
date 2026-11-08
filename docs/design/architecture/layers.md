# Layer Responsibilities and Contracts

Owns what each layer may do and what it may depend on. The overall structure is
in the [architecture overview](overview.md).

## Version and status

- **Architecture version:** `A0.6.0`.
- **Status:** Approved in the
  [project foundation decisions](../decisions/project-foundation.md). The composition root and
  the dependency rules are Observed in the source.

## Layer model

There are five layers. Domain, Application.Core, and Application form the framework-free core:
they do not import Angular or call browser APIs. There is no frameworks layer and no interface
adapters layer. Application.Core sits between Application and Domain and wraps Domain
([FND-82](../decisions/project-foundation.md#fnd-82--application-core-layer)).

| Layer | Folder | Responsibility | May depend on |
|---|---|---|---|
| Domain | `src/domain` | Entities, each module's state, and the rules that apply to them, as immutable classes whose methods are pure, and each module's commands as static methods of its state | Nothing outside itself |
| Application.Core | `src/application-core` | A run's records and the pure steps that move it on, the typed log entry kinds, and the interfaces Infrastructure implements | Domain |
| Application | `src/application` | Use cases, and the services that coordinate them | Application.Core, Domain |
| Infrastructure | `src/infrastructure` | Everything external, at the edge: implements Application.Core's interfaces for files, storage, the network, and any other outside dependency | Application.Core, Domain |
| UI | `src/ui` | Angular views, which call Application | Application, Application.Core, Domain |

Each layer has a top-level source folder with [module](../modules/README.md) folders inside,
and one module can appear in several layers. A module gets a folder in a layer when it has
code there, and its code map is updated then.

## Composition root

Application depends on abstractions that Application.Core defines, such as storage, and never on
an Infrastructure module. A composition root outside the five layers binds each abstraction to
its Infrastructure implementation at startup, through Angular's dependency injection. It is
the only code that may see every layer.

Application.Core defines these abstractions as abstract classes, and Angular uses each class as
its injection token
([FND-62](../decisions/project-foundation.md#fnd-62--dependency-injection-and-architecture-check)).
The binding is in `src/composition/app.config.ts`.

## Checking the rules

`npm run check:architecture` fails when a dependency points the wrong way, or when the core
imports Angular or uses a browser API, or when one module imports another without the
[module map](../modules/README.md#dependency-graph) showing that dependency
([FND-69](../decisions/project-foundation.md#fnd-69--module-jobs-and-the-module-graph-check)).
`.dependency-cruiser.cjs` holds the rules, and `tsconfig.core.json` compiles the core without
browser types.

## Immutability

Domain and Application.Core are strictly immutable and pure; Application.Core's only classes are
its abstractions. Application does the orchestration and coordination, and
may hold mutable services to do it, while its data stays immutable except where that would be a
considerable performance problem, proven by a benchmark
([FND-73](../decisions/project-foundation.md#fnd-73--immutable-architecture)). A run's whole
state is one value, and each step returns a new one, with its events and the follow-ups to carry
out. Each module's state is an immutable class in Domain, and its commands are pure static
methods of it. The simulation engine, in Application, holds the latest state in a service and
carries out the follow-ups, so no module calls another. A snapshot is just a reference to a past
state, which is what replay and branching rest on. It is not event sourcing: state is held
directly, and nothing derives it from events or from the log. A saved run can be recalculated by
calling the same pure functions again. This is the approved design, and
I02-E07
moved the code to it.
I03-E02
adds [how a run is held](../modules/simulation-engine.md#how-a-run-is-held): a line of
commits, each with a main root of two sub-roots.

## Data and mapping flow

Inner layers define their own data shapes and know nothing about outer ones. UI converts the
core's shapes into its own. Infrastructure converts them into what it stores, so Angular and
storage shapes do not reach the core. A repository owns what is stored: it maps each function to a
stored ID and each persisted record to its application record, so application records are never
stored directly ([Run history](../modules/run-history.md#repository)).

## Validation and errors

Each layer checks its own concerns:

- UI checks form input for quick feedback.
- Application checks use-case input.
- Domain enforces the rules that must always hold.

Expected failures, such as an invalid scenario or a full IndexedDB, are returned as typed
results. Exceptions are reserved for bugs. A bug inside a run stops that run and says where, and
the last good state remains. UI shows the results and has one catch-all for the rest. Failures
simulated by [Fault injection](../modules/fault-injection.md) are ordinary simulation events, not
application errors.

## Cross-links

- [Architecture overview](overview.md)
- [Capabilities and modules](../modules/README.md)
