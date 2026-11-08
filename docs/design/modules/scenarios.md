# Scenarios

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Partly implemented: the
  format, its validation, and the runner exist. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds it.

## Current and approved responsibilities

Defines the inputs for a run: the starting state, the steps, the version and its option
switches, and what the run is expected to show, so runs can be repeated and judged.

## Key approved business rules

- The file's format is in the [scenario format](scenario-format.md) page
  ([FND-70](../decisions/project-foundation.md#fnd-70--scenario-format)).
- Format, authors, where scenarios run, pass and fail, and the first built-in library
  ([FND-49](../decisions/project-foundation.md#fnd-49--scenarios)).
- Targets and limits ([FND-50](../decisions/project-foundation.md#fnd-50--targets-and-limits)).
- Inputs for comparing versions: the same scenario, with the same seed or across many seeds
  ([FND-51](../decisions/project-foundation.md#fnd-51--comparison)).
- A scenario file carries the cities and profiles it uses
  ([FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files)).
- Infrastructure reads, parses, and validates scenario files, the built-in ones included, and
  Application gets a typed scenario or its problems
  ([FND-72](../decisions/project-foundation.md#fnd-72--code-style)).
- Stored scenarios split into an unchanging `Scenario`, identified by its name, and a
  `ScenarioVersion` for each different content. Saved runs share the version they ran, which
  stays while any saved run uses it, even after its scenario is deleted
  ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)).
  Planned in
  I03-E02-023.

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Simulation engine](simulation-engine.md) (supplies run inputs),
  [Orders](orders.md) (the orders a scenario's run holds),
  [Versions](versions.md) (picks the version and switches),
  [Restaurants](restaurants.md) (restaurant and customer profiles),
  [Drivers](drivers.md) (driver profiles), [Map and routing](map-and-routing.md) (the
  city), and [Business rules](business-rules.md) (sets rules).
- **Used by:** [Verification](verification.md) (runs to check), [Analysis](analysis.md)
  (inputs), [Versions](versions.md) (runs to compare),
  [Import and export](import-and-export.md) (scenario files), and
  [Run history](run-history.md) (the scenario version a saved run ran).

## Code map

| Path | Purpose |
|---|---|
| `src/application-core/scenarios/scenario.ts` | A typed scenario, and the problems and warnings reading one can find |
| `src/application-core/scenarios/scripted-step.ts`, `scripted-command.ts` | A scenario's step: an action, with its actor, command, its own name for the order, and the indirect step it follows from, if any; rules to change; or an indirect effect; and who exists at the start, with the rules it starts with |
| `src/application-core/scenarios/schedule-scenario.ts` | Starts a run's script: each step becomes one of the Simulation engine's inputs ([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)), and the start's rules go into the values it starts with |
| `src/infrastructure/scenarios/read-scenario.ts`, `scenario-reader.ts`, `parse-scenario.ts`, `read-rule-settings.ts` | Parses a scenario file's text, and reads and validates the scenario it holds, its rule settings included ([FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions)) |
| `src/application/scenarios/scenario-runner.ts` | The Scenario runner, used by the browser and the command line: it runs a typed scenario |
| `src/application-core/scenarios/built-in-scenarios.ts` | The abstraction for the built-in library: it lists the scenarios, and gives one by its ID |
| `src/infrastructure/scenarios/bundled-scenarios.ts`, `built-in/one-order.json` | Its implementation, from the scenario files bundled with the simulator: so far, the happy path of one order |
| `src/application/scenarios/live-scenario-run.ts`, `live-run-state.ts` | One scenario being watched live: the service that moves its run by the wall clock, up to its stated end |
| `src/application-core/scenarios/ticker.ts` | The abstraction for being called back regularly |
| `src/infrastructure/scenarios/browser-ticker.ts` | Its browser implementation, from the frames the browser draws |
| `src/application-core/scenarios/scenario-files.ts` | The abstraction for reading a chosen file: it gives the scenario the file holds, or its problems |
| `src/infrastructure/scenarios/browser-scenario-files.ts` | Its browser implementation, which reads and parses the file |
| `src/application-core/scenarios/one-order.testing.ts`, `scenario-ports.testing.ts` | For tests: the one-order scenario, typed, and stand-ins for the two abstractions |
| `src/composition/built-in-library.spec.ts` | Reads each built-in scenario from its file, runs it, and judges it |
| `scripts/run-scenario.mjs` | Runs a scenario file on the command line, reading it through Infrastructure |
