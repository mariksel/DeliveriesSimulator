# Scenarios

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list). Partly
  implemented: the format, its validation, and the runner exist. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds it.

## Current and approved responsibilities

Defines the inputs for a run: the starting state, the steps, the version and its option
switches, and what the run is expected to show, so runs can be repeated and judged.

## Key approved business rules

- The file's format is in the [scenario format](scenario-format.md) page
  ([FND-70](../decisions/project-foundation/simulation-model.md#fnd-70--scenario-format)).
- Format, authors, where scenarios run, pass and fail, and the first built-in library
  ([FND-49](../decisions/project-foundation/simulation-model.md#fnd-49--scenarios)).
- Targets and limits
  ([FND-50](../decisions/project-foundation/simulation-model.md#fnd-50--targets-and-limits)).
- Inputs for comparing versions: the same scenario, with the same seed or across many seeds
  ([FND-51](../decisions/project-foundation/simulation-model.md#fnd-51--comparison)).
- A scenario file carries the cities and profiles it uses
  ([FND-58](../decisions/project-foundation/architecture-and-code.md#fnd-58--stored-records-and-shared-files)).
- The built-in library lists first a demonstration, a busy lunch in a four-area city that shows
  the whole process built so far, every order delivered by its end; then the one-order case the
  tests pin. Nothing opens by itself on start
  ([FND-49](../decisions/project-foundation/simulation-model.md#fnd-49--scenarios)).
- Infrastructure reads, parses, and validates scenario files, the built-in ones included, and
  Application gets a typed scenario or its problems
  ([FND-72](../decisions/project-foundation/architecture-and-code.md#fnd-72--code-style)).
- Stored scenarios split into an unchanging `Scenario`, identified by its name, and a
  `ScenarioVersion` for each different content. Saved runs share the version they ran, which
  stays while any saved run uses it, even after its scenario is deleted
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- As built in
  [I03-E02-023](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-023-versioned-scenario-storage.md),
  on 2026-11-09:
  - **Versions:** a version's content is every field of the scenario, in the form the app writes
    it, so a file's spacing and key order do not count. Versions are numbered from 1 per name.
    Storing identical content gives the kept version; different content gives the next number.
  - **Deleting:** a deleted scenario is no longer listed, and its versions go, except those a
    saved run uses. Storing its name again lists it again and carries its numbering on, and
    identical content gets a kept version back. Once no version is in use, the name goes too,
    and a later one starts at 1.
  - **Storage:** the repository is declared in Application.Core and asynchronous; the rules for
    one name are pure functions there, which the IndexedDB repository applies in one transaction
    per call. Records carry schema version 2, which gives every scenario a city. A version 1
    record, stored before scenarios had cities, gets one square area around its places as it is
    read, named as the one area they use, with the scenario's seed, and its content key is worked
    out again; one whose places use several areas is refused, saying why
    ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)). A record of a later
    version, or of another shape, is refused. A built-in scenario is stored as any other: saving a run stores its
    scenario first, a built-in one included, and the saved run then notes its use of that
    version
    ([I03-E02-008](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-008-saved-runs-at-two-levels.md)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries)):

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
| `src/application-core/scenarios/scenario-city.ts` | A scenario's city, and the seed its places are picked from ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)) |
| `src/application-core/scenarios/scripted-step.ts`, `scripted-command.ts` | A scenario's step: an action, with its actor, command, its own name for the order, and the indirect step it follows from, if any; rules to change; or an indirect effect; and the city and who exists at the start, with the rules it starts with |
| `src/application-core/scenarios/schedule-scenario.ts` | Starts a run's script: each step becomes one of the Simulation engine's inputs ([FND-83](../decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)), and the start's rules go into the values it starts with, and its city into the script |
| `src/application-core/scenarios/scenario-version.ts`, `scenario-shelf.ts`, `scenario-repository.ts` | A stored scenario and its versions, the rules for storing, using, and deleting them, and the repository's abstraction ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/infrastructure/scenarios/persisted-scenario.ts`, `indexed-db-scenario-repository.ts` | A scenario's whole content as persisted, and the key that tells content apart; the repository in IndexedDB, at schema version 2, reading version 1 records with a city made around their places |
| `src/infrastructure/scenarios/read-scenario.ts`, `scenario-reader.ts`, `parse-scenario.ts`, `read-rule-settings.ts`, `read-city.ts`, `read-place.ts` | Parses a scenario file's text, and reads and validates the scenario it holds, its rule settings included ([FND-84](../decisions/project-foundation/architecture-and-code.md#fnd-84--rule-abstractions)) |
| `src/application/scenarios/scenario-runner.ts` | The Scenario runner, used by the browser and the command line: it runs a typed scenario |
| `src/application-core/scenarios/built-in-scenarios.ts` | The abstraction for the built-in library: it lists the scenarios, and gives one by its ID |
| `src/infrastructure/scenarios/bundled-scenarios.ts`, `built-in/demonstration.json`, `built-in/one-order.json` | Its implementation, from the scenario files bundled with the simulator, in the start page's order: the demonstration, then the happy path of one order |
| `src/application/scenarios/live-scenario-run.ts`, `live-run-state.ts` | One scenario being watched live: the service that moves its run by the wall clock, up to its stated end |
| `src/application-core/scenarios/ticker.ts` | The abstraction for being called back regularly |
| `src/infrastructure/scenarios/browser-ticker.ts` | Its browser implementation, from the frames the browser draws |
| `src/application-core/scenarios/scenario-files.ts` | The abstraction for reading a chosen file: it gives the scenario the file holds, or its problems |
| `src/infrastructure/scenarios/browser-scenario-files.ts` | Its browser implementation, which reads and parses the file |
| `src/application-core/scenarios/one-order.testing.ts`, `scenario-ports.testing.ts` | For tests: the one-order scenario, typed, and stand-ins for the two abstractions |
| `src/composition/built-in-library.spec.ts` | Reads each built-in scenario from its file, runs it, and judges it |
| `scripts/run-scenario.mjs` | Runs a scenario file on the command line, reading it through Infrastructure |
