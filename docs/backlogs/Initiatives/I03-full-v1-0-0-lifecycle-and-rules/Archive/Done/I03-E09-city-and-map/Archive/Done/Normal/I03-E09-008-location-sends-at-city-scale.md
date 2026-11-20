# I03-E09-008 — Location sends at city scale

| Field | Value |
| --- | --- |
| ID | `I03-E09-008` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | Normal |
| Evidence | Approved; Implemented |
| Created | 2026-11-11 |
| Last updated | 2026-11-12 |
| Completed | 2026-11-12 |

## Scope

Make drivers' location sends cheap enough that a run handles hundreds of drivers and thousands of
orders in a simulated day again, as
[FND-48](../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)
requires, with every online driver's app still sending every 30 seconds. Until then the city
benchmark runs 50 drivers and 500 orders, which fit
([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
It is done before the city-scale stage, `I07`, starts. How sends get cheaper is decided when it is
planned.

The user chose on 2026-11-11 to batch sends: all the sends due at one moment make one commit
holding each driver's location, with one log entry listing them ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Acceptance criteria

- The city benchmark runs 200 drivers and 2,000 orders in a simulated day, with sends every 30
  seconds, inside the memory a development PC has, as the user chose on 2026-11-12
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- The benchmark's default size is 200 drivers and 2,000 orders.

## Dependencies

- [I03-E09-006 — Drivers on the move](../High/I03-E09-006-drivers-on-the-move.md)

## Sources and evidence

- [Simulation engine: Performance](../../../../../../../../../design/modules/simulation-engine.md#performance)
- [Project foundation: FND-48](../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-11. The details are in
[FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-008-P01` | Batched sends | Done | 2026-11-12 | Implemented; Tested |
| `I03-E09-008-P02` | The driver in four parts | Done | 2026-11-12 | Implemented; Tested |
| `I03-E09-008-P03` | City scale | Done | 2026-11-12 | Implemented; Tested |

### Plan

After each phase, `npm run check` passes.

1. **P01, batched sends:** all apps' sends due at one moment are one piece of due work and one
   API call, holding each driver's location, through a new Deliveries state function,
   `receive-locations`, with one log entry listing them. The single-send function stays
   registered, so saved runs that hold single sends still load and replay. The timeline, event
   list, trace, and map show the batch, and the pinned digests and end-to-end numbers follow.
2. **P02, the driver in four parts:** measured, each send kept about 700 bytes, mostly a new
   driver version made only to hold a new location. By the rule the user chose for records whose
   parts change at different rates ([FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)), the driver splits into `Driver`, `DriverVersion`
   with their area, their location as its own version chain, and their status as its own version
   chain, read together as the driver's full view. Saved runs move to schema version 6, refusing
   one saved before, and the pinned fingerprints are updated in place.
3. **P03, city scale:** a 200-driver, 2,000-order day is run and measured, as the user lowered
   the scope from 500 drivers. The benchmark's default becomes 200 drivers and 2,000 orders, with
   the measurements recorded.

## Status history

- 2026-11-11 — Created as Proposed: sends every 30 seconds made a 200-driver day run out of
  memory, so the user chose 50 drivers for now and to restore hundreds before `I07`
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
  It starts when its dependency is Done.
- 2026-11-11 — Moved from Proposed to Ready: its dependency, I03-E09-006, is Done.
- 2026-11-11 — Moved from Ready to In Progress: the 50-driver day made 364,124 commits, two for
  each send, and the user chose to batch the sends due at one moment into one commit, and
  approved the plan ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-12 — P01 Done, still In Progress: all the sends due at one moment are one call,
  `send-locations`, through `drivers.deliveries.receive-locations`, with one log entry listing
  them; runs saved before keep their single sends. `npm run check` passes
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-12 — Still In Progress, with the plan changed: measuring P02, a 500-driver day took
  about 8 minutes and peaked at about 5 GB, so the user chose to split the driver by how often
  each part changes, as a new P02, with city scale moving to P03 ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-12 — P02 Done, still In Progress: a driver is `Driver`, `DriverVersion` with their
  area, and a status and a location with versions of their own; saved runs are at schema version
  6, and the five pins of functions giving back drivers were updated in place. Due sends, due
  stops, loaded reads, and the run's index were made cheaper with the same digests: a
  500-driver day took 215 seconds and held 1,506 MB, and the user lowered this item's scope to 200
  drivers and 2,000 orders. `npm run check` passes
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-12 — P03 Done, and the item Done: the benchmark's default is 200 drivers and
  2,000 orders, which ran in 58 seconds inside Node's default heap, held 656 MB with every root,
  and saved and loaded back as the same run at both levels. `npm run check` passes
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-11 — Created at Normal priority: it is needed before `I07`, not to finish this stage's
  map work.
