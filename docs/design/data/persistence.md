# Data

Owns what data the project holds, where it lives, and how it changes.

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved for the location and mechanism, in
  [FND-4](../decisions/project-foundation/architecture-and-code.md#fnd-4--data-in-browser-storage)
  and [FND-15](../decisions/project-foundation/architecture-and-code.md#fnd-15--indexeddb), and for
  lifetime and change rules in
  [FND-57](../decisions/project-foundation/architecture-and-code.md#fnd-57--hosting-and-data) and
  [FND-58](../decisions/project-foundation/architecture-and-code.md#fnd-58--stored-records-and-shared-files).
  Scenarios are the first data in browser storage, since I03-E02-023 on 2026-11-09, and saved
  runs follow with I03-E02-008; the rest follows with the items that build each.

## Current design

Data lives in browser storage, using IndexedDB. The code reaches it through interfaces
defined by the Application.Core [layer](../architecture/layers.md) and implemented by
Infrastructure
([FND-82](../decisions/project-foundation/architecture-and-code.md#fnd-82--application-core-layer)).
No backend or server database has been named. Browser storage stays on one machine;
[Import and export](../modules/import-and-export.md) shares data as files.

## Data ownership

| Data | Owner | Lifetime | Notes |
|---|---|---|---|
| Past runs | [Run history](../modules/run-history.md) | Until the user deletes them | Saved in browser storage at a chosen [level](../modules/run-history.md#saved-runs-and-levels) so results can be reviewed and compared; can be shared as run files |
| Scenarios | [Scenarios](../modules/scenarios.md) | Until the user deletes them; a version a saved run uses stays while any such run does | Saved in browser storage; each edit makes a new version, and saved runs share the version they ran ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| Versions | [Versions](../modules/versions.md) | Until the user deletes them | Saved in browser storage |
| Tuning presets | [Versions](../modules/versions.md) | Until the user deletes them | Saved in browser storage |
| Cities | [Map and routing](../modules/map-and-routing.md) | Until the user deletes them | Saved in browser storage; shared inside the scenarios that use them |
| Driver profiles | [Drivers](../modules/drivers.md) | Until the user deletes them | Saved in browser storage; shared inside the scenarios that use them |
| Restaurant and customer profiles | [Restaurants](../modules/restaurants.md) | Until the user deletes them | Saved in browser storage; shared inside the scenarios that use them |

## Change rules

Stored data carries a schema version. A new release migrates older data when it loads it
([FND-57](../decisions/project-foundation/architecture-and-code.md#fnd-57--hosting-and-data)). Each
stored scenario record holds its schema version, and the database's own version follows it, at 3
since scenarios have customers: this release reads version 1 records too, giving each one a city
around its places, and refuses any later version. A version 1 or 2 record whose create-order steps
name no customer or address is refused, saying it was stored before orders had customers, as
nothing is made up for it. A stored scenario from before drivers' apps sent their locations gets
the default sending interval and speed for each driver, as reading its file would give them. A
saved run's records hold their schema
version too, at 4 since orders have customers, and a chain of migrations reads older ones on
load: a version 3 run that made orders is refused, saying why, and this release refuses a later
version, or one no migration reads. A scenario or run whose places use several
areas cannot be given a city that keeps each place in its area, so it is refused, saying why
([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

Nothing is stored directly: a [repository](../modules/run-history.md#repository) maps every
persisted record to its application record.

## Code map

| Path | Purpose |
|---|---|
| `src/application-core/scenarios/scenario-repository.ts`, `src/infrastructure/scenarios/indexed-db-scenario-repository.ts` | Stored scenarios and their versions, in the IndexedDB database `deliveries-simulator-scenarios`, at schema version 3, reading version 1 records with a city made around their places, and refusing older records that create orders without customers; tested with the `fake-indexeddb` development package |
| `src/application-core/run-history/run-repository.ts`, `src/infrastructure/run-history/indexed-db-run-repository.ts` | Saved runs as persisted records, in the IndexedDB database `deliveries-simulator-runs`, at schema version 8 with a chain of migrations; a run saved before cities gets one around its places as it is read, one saved before customers that made orders is refused, one saved before waiting points keeps its drivers where they finish, one saved before a driver's status and location had versions of their own is refused, one saved before an order's status was read from its events is refused, and one saved before Deliveries' copy of an order was a record of its own is refused |
