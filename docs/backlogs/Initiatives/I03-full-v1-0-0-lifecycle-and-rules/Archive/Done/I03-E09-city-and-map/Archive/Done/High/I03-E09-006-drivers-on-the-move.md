# I03-E09-006 — Drivers on the move

| Field | Value |
| --- | --- |
| ID | `I03-E09-006` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-11 |
| Last updated | 2026-11-11 |
| Completed | 2026-11-11 |

## Scope

Drivers move along their routes: on accepting a request, a driver rides to the restaurant at
20 km/h along the streets, waits there, and after the pick-up rides to the delivery address.
A driver holding several orders rides to the nearest stop that is due. An online driver's app
sends a location every 30 seconds, moving or waiting, by the location send that
[I03-E03-012](../../../../../../I03-E03-paths-and-commands/High/I03-E03-012-driver-status-and-location.md)
would otherwise bring. A scripted pick-up or delivery runs at its time or on arrival,
whichever is later, unless the step says it runs at its time regardless. Speed and send
interval are scenario settings, per driver if wanted. The Map view draws each driver's planned
route ahead of them. The demonstration scenario is retuned to keep its story.

## Acceptance criteria

- A driver who accepts a request reaches the restaurant, then the address, along the streets,
  at the speed set, sending locations at the interval set.
- A scripted pick-up or delivery waits for the driver to arrive, unless its step says not to.
- The Map view draws each driver's route still to go, and their track behind them.

## Dependencies

- [I03-E09-002 — Delivery addresses](I03-E09-002-delivery-addresses.md)
- [I03-E09-005 — Streets and routing](I03-E09-005-streets-and-routing.md)

## Sources and evidence

- [Map and routing](../../../../../../../../../design/modules/map-and-routing.md)
- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)
- [V1.0.0 business rules](../../../../../../../../../design/versions/V1.0.0/business-rules.md)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-11, and P01 has started. The details are in
[FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-006-P01` | Location sending | Done | 2026-11-11 | Implemented; Tested |
| `I03-E09-006-P02` | Riding | Done | 2026-11-11 | Implemented; Tested |
| `I03-E09-006-P03` | The map and the demonstration | Done | 2026-11-11 | Implemented; Tested |

### Plan

After each phase, `npm run check` passes.

1. **P01, location sending:** each online driver's app sends its location every 30 seconds,
   moving or waiting, as an API call through a new Drivers state function. Speed and send
   interval are scenario settings, 20 km/h and 30 seconds unless given, per driver if wanted.
   Drivers do not move yet, so the demonstration's start-time workaround goes. The phase measures
   the city benchmark's cost and reports it before riding starts.
2. **P02, riding:** a rider's plan lives in the run's indirect part, where FND-81 places
   simulated actors' plans. After each accept, pick-up, or delivery, the driver sets off to the
   nearest due stop along the streets at their speed; their position is worked out along the
   route, and each send reports it. A scripted pick-up or delivery waits for arrival unless its
   step says to run at its time.
3. **P03, the map and the demonstration:** each driver's route still to go is drawn ahead of
   them and their track behind; the demonstration is retuned to keep its story; tests, pins, and
   the design pages.

## Status history

- 2026-11-11 — Created as Proposed: after seeing screenshots of the Map view, the user asked
  for a minimal map that is actually useful
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)). It starts when its dependencies are Done.
- 2026-11-11 — Moved from Proposed to Ready: its dependencies, I03-E09-002 and I03-E09-005,
  are Done.
- 2026-11-11 — Moved from Ready to In Progress: after the user saw that drivers do not move yet, they
  chose that an online driver's app sends every 30 seconds, moving or waiting, that a driver rides
  to the nearest due stop, and that the demonstration is retuned to keep its story, and approved
  the plan ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P01 Done, still In Progress: each online driver's app sends its location every 30
  seconds, as an API call through `drivers.deliveries.receive-location`, with the interval and
  speed as scenario settings. Sends made a 200-driver day run out of memory, so the user kept the
  30 seconds and deferred city scale: the benchmark runs 50 drivers and 500 orders, and
  I03-E09-008 restores hundreds before `I07` ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P02 Done, still In Progress: drivers ride along the streets to their nearest due
  stop, and their apps send where they are. The user chose that a scripted pick-up or delivery
  waiting for its driver holds up only itself; a driver's later step on the same order waits
  behind it ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P03 Done, and the item Done: the Map view draws each driver's route still
  to go, and the demonstration keeps its story. `npm run check` passes, but for the format of the
  workspace file, which was edited by hand outside this item; a WebKit end-to-end test failed now
  and then under the full suite's load, a different one each time, and each passed when run
  again ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-11 — Created at High priority, like the rest of the stage, when the user asked for a
  map that is actually useful.
