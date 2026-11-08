# Capability and Module Map

Owns the list of capabilities and how they depend on each other. Each capability
has its own page, created from the [module template](_module-template.md).

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** The capability list is approved in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list), as amended by
  [FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries). Part of it is
  implemented: each module's page says how much. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds the rest.

## Modules

- [Orders](orders.md) — Simulates the order lifecycle.
- [Drivers](drivers.md) — Simulates the drivers and their rules, with Deliveries as its
  submodule: delivery requests, dispatch, and notifications to drivers.
- [Restaurants](restaurants.md) — The simulated restaurants, who create orders and hand them
  over, with Customers as its submodule: the customers, who receive deliveries.
- [Business rules](business-rules.md) — The abstractions every module writes its own rules
  with, so that a rule can be shown and changed; it knows no module's rules.
- [System](system.md) — The abstractions about time, randomness, and math that the business
  modules use without knowing they are simulated.
- [Payments](payments.md) — Simulated money movements: prices charged, cash collected, cash
  confirmations, and payment returns.
- [Notifications](notifications.md) — Simulated notifications to drivers and restaurants, and
  the push pipeline that delivers them, as the real service would send them.
- [Map and routing](map-and-routing.md) — The delivery area, distances, and routes, in a
  synthetic city that the simulator draws.
- [Simulation engine](simulation-engine.md) — The simulated clock, the start, pause, and
  speed controls, and the event loop that drives the other modules.
- [Scenarios](scenarios.md) — Defines the inputs for a run, such as order volume, drivers,
  and area, so runs can be repeated.
- [Fault injection](fault-injection.md) — Simulates failures such as delays, outages, and
  failed deliveries, for developers and QA.
- [Event log](event-log.md) — A complete, ordered record of everything in a run.
- [Run history](run-history.md) — Shows a run's history as a timeline you can zoom and fork, and
  saves past runs in browser storage so results can be reviewed and compared.
- [Import and export](import-and-export.md) — Shares scenarios, versions, tuning presets, and
  stored runs as files, since browser storage stays on one machine.
- [Business view](business-view.md) — Shows the simulation in business terms, such as
  rules and outcomes.
- [Technical view](technical-view.md) — Shows the simulation in technical terms, such as
  states and events.
- [Versions](versions.md) — The simulated versions of the real service, their option switches,
  comparison, and the conformance exchange.
- [Verification](verification.md) — Checks runs against the criteria and invariants, proves
  rules for small setups, and measures coverage.
- [Analysis](analysis.md) — Analysis across many runs, including the offline dispatch model.

Which module owns each capability is in [capability ownership](capability-ownership.md). The
[scenario format](scenario-format.md) describes the scenario file.

## Dependency graph

Each module, what it uses, and why. The user confirmed this graph on 2026-11-03, in I01-E03-006
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)), and added the run
files dependency in
[FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files), and the
commits and saved runs dependencies in
[FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions), and
Verification's run records dependency in
[FND-82](../decisions/project-foundation.md#fnd-82--application-core-layer), and its order states
and event kinds dependencies in [FND-72](../decisions/project-foundation.md#fnd-72--code-style).
[FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules) adds System,
which every module uses; makes Drivers the module that holds Deliveries, and Restaurants the one
that holds Customers; and has Orders and Drivers use Restaurants, and Orders and Drivers use
Business rules for its abstractions. A submodule sits in its module's folder and counts as part
of it. [FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions) has the Simulation
engine tune rules and Scenarios set them through Business rules, and Business rules read the
run's rules from the Simulation engine, for its Rules panel. FND-81 adds Run history's link to
Scenarios, for the scenario version a saved run ran, on 2026-11-08.

```text
Business view
  ──reads──> Event log
  ──order states──> Orders
  ──drivers and dispatch──> Drivers
  ──cash──> Payments
  ──restaurants and customers──> Restaurants
  ──heatmaps──> Map and routing
Technical view
  ──reads──> Event log
  ──instances and jobs──> Simulation engine
Verification
  ──runs to check──> Scenarios
  ──run records──> Event log
  ──the rules checked──> Versions
  ──criteria──> Business rules
  ──saved runs to rerun──> Run history
  ──run records──> Simulation engine
  ──order states──> Orders
  ──event kinds──> Drivers
Analysis
  ──many runs──> Simulation engine
  ──stored runs──> Run history
  ──inputs──> Scenarios
  ──values to vary──> Versions
Versions
  ──rules per version──> Business rules
  ──runs to compare──> Scenarios
  ──stored runs──> Run history
Scenarios
  ──supplies run inputs──> Simulation engine
  ──sets rules──> Business rules
  ──the orders a scenario's run holds──> Orders
  ──picks the version and switches──> Versions
  ──restaurant and customer profiles──> Restaurants
  ──driver profiles──> Drivers
  ──the city──> Map and routing
Fault injection
  ──breaks steps──> Orders
  ──breaks steps──> Drivers
  ──breaks steps──> Payments
  ──breaks steps──> Notifications
  ──provider failures──> Map and routing
  ──skews clocks──> Simulation engine
Run history
  ──reads──> Event log
  ──commits──> Simulation engine
  ──the scenario a saved run ran──> Scenarios
Import and export
  ──scenario files──> Scenarios
  ──version files──> Versions
  ──run files──> Run history
Simulation engine
  ──drives──> Orders
  ──drives──> Drivers
  ──drives the actors──> Restaurants
  ──drives──> Payments
  ──drives──> Notifications
  ──moves drivers──> Map and routing
  ──writes every event──> Event log
  ──applies faults──> Fault injection
  ──tunes rules──> Business rules
Business rules
  ──the run's rules, for the Rules panel──> Simulation engine
Restaurants
  ──create orders──> Orders
  ──where they are──> Map and routing
Orders
  ──rule abstractions──> Business rules
  ──money movements──> Payments
  ──handoff, cancel, events──> Drivers
  ──restaurant pushes──> Notifications
  ──the restaurant an order is from──> Restaurants
Drivers
  ──rule abstractions──> Business rules
  ──distances──> Map and routing
  ──driver pushes──> Notifications
  ──driver commands, events──> Orders
  ──where restaurants are──> Restaurants
Payments
  ──pricing rules──> Business rules
Notifications
  ──drivers' devices──> Drivers
  ──restaurants' devices──> Restaurants
Every module
  ──time, randomness, math, and shared helpers──> System
```

Every module uses System. Besides it, Event log and Map and routing use no other module, and
System uses none at all.

The graph describes known conceptual dependencies; exact runtime calls are in the
linked source. Cross-cutting designs: [architecture layers](../architecture/layers.md),
[UI](../ui/README.md), [data](../data/persistence.md),
[integrations](../integrations/README.md). Any dependency not shown here does not exist; add
it here, with the user's approval, before code relies on it. The architecture check reads this
graph, and fails on an import it does not show
([FND-69](../decisions/project-foundation.md#fnd-69--module-jobs-and-the-module-graph-check)).
