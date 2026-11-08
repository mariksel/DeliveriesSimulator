# Data

Owns what data the project holds, where it lives, and how it changes.

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved for the location and mechanism, in
  [FND-4](../decisions/project-foundation.md#fnd-4--data-in-browser-storage) and
  [FND-15](../decisions/project-foundation.md#fnd-15--indexeddb), and for lifetime and change
  rules in [FND-57](../decisions/project-foundation.md#fnd-57--hosting-and-data) and
  [FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files).
  No source exists to check it against yet.

## Current design

Data lives in browser storage, using IndexedDB. The code reaches it through interfaces
defined by the Application.Core [layer](../architecture/layers.md) and implemented by
Infrastructure
([FND-82](../decisions/project-foundation.md#fnd-82--application-core-layer)). No backend or
server database has been named. Browser storage stays on one machine;
[Import and export](../modules/import-and-export.md) shares data as files.

## Data ownership

| Data | Owner | Lifetime | Notes |
|---|---|---|---|
| Past runs | [Run history](../modules/run-history.md) | Until the user deletes them | Saved in browser storage at a chosen [level](../modules/run-history.md#saved-runs-and-levels) so results can be reviewed and compared; can be shared as run files |
| Scenarios | [Scenarios](../modules/scenarios.md) | Until the user deletes them; a version a saved run uses stays while any such run does | Saved in browser storage; each edit makes a new version, and saved runs share the version they ran ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| Versions | [Versions](../modules/versions.md) | Until the user deletes them | Saved in browser storage |
| Tuning presets | [Versions](../modules/versions.md) | Until the user deletes them | Saved in browser storage |
| Cities | [Map and routing](../modules/map-and-routing.md) | Until the user deletes them | Saved in browser storage; shared inside the scenarios that use them |
| Driver profiles | [Drivers](../modules/drivers.md) | Until the user deletes them | Saved in browser storage; shared inside the scenarios that use them |
| Restaurant and customer profiles | [Restaurants](../modules/restaurants.md) | Until the user deletes them | Saved in browser storage; shared inside the scenarios that use them |

## Change rules

Stored data carries a schema version. A new release migrates older data when it loads it
([FND-57](../decisions/project-foundation.md#fnd-57--hosting-and-data)).

Nothing is stored directly: a [repository](../modules/run-history.md#repository) maps every
persisted record to its application record.

## Code map

| Path | Purpose |
|---|---|
| `src/application-core/run-history/run-repository.ts`, `src/infrastructure/run-history/memory-run-repository.ts` | The repository, which keeps runs as persisted records; in memory until browser storage arrives |
